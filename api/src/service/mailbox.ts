import { Email, EmailFilterCondition, EmailSubmission, Mailbox, Methods, Requests, Responses } from "jmap-jam"
import { MailStorage } from "../../../common/dao/src/MailStorage"
import MailboxModel from "../../../common/dao/src/models/Mailbox.model"
import Message, { Marker, ReservedLabel } from "../../../common/dao/src/models/Message.model"
import { RecursivePartial } from "../utils/types"
import { SendingService } from "./sending"

type Response<T extends Methods> = RecursivePartial<Responses<Requests[T]>[T]>

export class MailboxService {
  private readonly mailStorage: MailStorage
  private readonly sendingService: SendingService

  constructor(mailStorage: MailStorage, sendingService: SendingService) {
    this.mailStorage = mailStorage
    this.sendingService = sendingService
  }

  async getMailbox({ accountId }: Requests["Mailbox/get"])
    : Promise<Response<"Mailbox/get">> {
    const decodedEmail = Buffer.from(accountId, 'base64url').toString()
    const mailboxId = MailboxModel.fromEmail(decodedEmail)
    const ids = await this.mailStorage.getMessageIds(mailboxId)

    const mailbox: Mailbox = {
      id: "inbox",
      name: "Inbox",
      parentId: null,
      role: "inbox",
      sortOrder: 0,
      totalEmails: ids.length,
      unreadEmails: 0,
      totalThreads: 0,
      unreadThreads: 0,
      iSubscribed: false,
      myRights: {
        mayReadItems: true,
        mayAddItems: false,
        mayRemoveItems: false,
        maySetSeen: true,
        maySetKeywords: false,
        mayCreateChild: false,
        mayRename: false,
        mayDelete: false,
        maySubmit: false
      }
    }

    return {
      accountId: mailboxId.id,
      state: "",
      list: [mailbox],
      notFound: []
    }
  }

  // TODO
  async setEmailSubmission({ accountId, create }: Requests["EmailSubmission/set"])
    : Promise<Response<"EmailSubmission/set">> {
    const decodedEmail = Buffer.from(accountId, 'base64url').toString()
    const mailbox = MailboxModel.fromEmail(decodedEmail)

    const sendTask = Object.entries(create ?? {}).map(async ([key, value]) => {
      const email = await this.mailStorage.getMessage(mailbox, value.emailId)
      const result = await this.sendingService.send(email)
      return { key: key, success: result }
    }, this)

    const sendResult = await Promise.all(sendTask)

    return {
      accountId: accountId,
      created: sendResult.filter(({ success }) => success).reduce((p, { key }) => ({
        ...p, [key]: { id: key }
      } satisfies RecursivePartial<EmailSubmission>), {}),
      notCreated: sendResult.filter(({ success }) => !success).reduce((p, { key }) => ({
        ...p, [key]: {}
      }), {})
    }
  }

  async getEmail({ accountId, ...args }: Requests["Email/get"])
    : Promise<Response<"Email/get">> {
    const decodedEmail = Buffer.from(accountId, 'base64url').toString()
    const mailbox = MailboxModel.fromEmail(decodedEmail)

    const ids = args.ids ?? await this.mailStorage.getMessageIds(mailbox)
    const emails = await this.mailStorage.getMessages(mailbox, ids)

    return {
      accountId: accountId,
      state: '',
      notFound: [],
      list: emails.map(m => {
        const htmlBody = args.fetchHTMLBodyValues ? [{
          partId: "1a",
          size: m.html?.length,
          type: "text/html"
        }] : []
        const textBody = args.fetchTextBodyValues ? [{
          partId: "2a",
          size: m.text?.length,
          type: "text/plain"
        }] : []
        const bodyValues: Record<string, object> = {}
        if (args.fetchHTMLBodyValues) {
          bodyValues["1a"] = {
            isTruncated: false,
            value: m.html
          }
        }
        if (args.fetchTextBodyValues) {
          bodyValues["2a"] = {
            isTruncated: false,
            value: m.text
          }
        }

        return ({
          id: m.id,
          mailboxIds: Array.from(m.labels).reduce((p, l) => ({ ...p, [l]: true }), {}),
          keywords: {},
          receivedAt: m.date,
          messageId: [],
          inReplyTo: m.inReplyTo ? [m.inReplyTo] : [],
          sender: [],
          from: [{ name: m.from?.name ?? null, email: m.from?.address ?? '' }],
          to: m.to?.map(a => ({ name: a.name ?? null, email: a.address! })) ?? [],
          cc: [],
          bcc: [],
          replyTo: [],
          subject: m.subject,
          sentAt: m.date,
          bodyValues: bodyValues,
          htmlBody: htmlBody,
          textBody: textBody,
        } satisfies RecursivePartial<Email>)
      })
    }
  }

  async setEmail({ accountId, ...args }: Requests["Email/set"])
    : Promise<Response<"Email/set">> {
    const decodedEmail = Buffer.from(accountId, 'base64url').toString()
    const mailbox = MailboxModel.fromEmail(decodedEmail)

    const createTasks = Object.entries(args.create ?? []).map(async ([k, email]) => {
      const textValue = Object.values(email.textBody ?? {})
        .reduce((p, c) => p + email.bodyValues[c.partId!].value, '')
      const htmlValue = Object.values(email.htmlBody ?? {})
        .reduce((p, c) => p + email.bodyValues[c.partId!].value, '')
      const message = new Message(this.mailStorage.generateId())
      message.html = htmlValue
      message.text = textValue
      message.subject = email.subject ?? undefined
      message.to = email.to?.map(a => ({ name: a.name ?? undefined, address: a.email }))
      message.from = { name: undefined, address: mailbox.id }
      message.labels.add(ReservedLabel.All)
      message.labels.add(ReservedLabel.Drafts)
      message.markers.add(Marker.Seen)
      message.date = new Date().toISOString()
      await this.mailStorage.putMessage(mailbox, message.id, message)
      return [k, message.id]
    })
    const created = await Promise.all(createTasks)

    const destroyTasks = args.destroy?.map(async destroyId => {
      await this.mailStorage.delete(mailbox, destroyId)
      return destroyId
    }) ?? []
    const destroyed = await Promise.all(destroyTasks)

    return {
      accountId: accountId,
      destroyed: destroyed,
      created: created.reduce<Response<'Email/set'>['created']>((p, c) => {
        const r = !p ? {} : p
        r[c[0]] = {
          id: c[1],
        }
        return r
      }, undefined)
    }
  }

  async queryEmail({ accountId, filter }: Requests["Email/query"])
    : Promise<Response<"Email/query">> {
    const decodedEmail = Buffer.from(accountId, 'base64url').toString()
    const parsedFilter = filter as EmailFilterCondition
    const mailbox = parsedFilter?.inMailbox as unknown as ReservedLabel ?? ReservedLabel.All
    const emailIds = await this.mailStorage.getMessageIds(
      MailboxModel.fromEmail(decodedEmail), mailbox)

    return {
      accountId: accountId,
      ids: emailIds
    }
  }
}
