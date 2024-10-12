import { Ulid } from 'id128';
import { Bindings } from '..';
import { MailStorage, MessageMetadataResponse } from '../MailStorage';
import Mailbox from '../models/Mailbox.model';
import Message, { ReservedLabel } from '../models/Message.model';

export class CFMailStorage implements MailStorage {
  private messageMetadata: KVNamespace
  private indexLabels: KVNamespace
  private messageBlob: R2Bucket

  constructor(env: Bindings) {
    this.messageBlob = env.messageBlob
    this.messageMetadata = env.messageMetadata
    this.indexLabels = env.indexLabels
  }

  generateId(): string {
    return Ulid.generate().toCanonical()
  }

  async getMessage(
    mailbox: Mailbox,
    messageId: string)
    : Promise<Message> {
    const messageKey = `${mailbox.id}:${messageId}`
    const messageMetadata = await this.messageMetadata.get(messageKey)
    return new Message(messageId, JSON.parse(messageMetadata || '{}'))
  }

  async putMessage(
    mailbox: Mailbox,
    messageId: string,
    message: Message)
    : Promise<void> {
    const messageKey = `${mailbox.id}:${messageId}`

    // Store message attachments as blob
    for await (const [partId, mimePart] of message.parts ?? []) {
      const messagePartId = `${messageKey}:${partId}`
      if (mimePart.content) {
        await this.messageBlob.put(messagePartId, mimePart.content)
        mimePart.content = undefined
      }
    }

    // Add message metadata to mailbox
    await this.messageMetadata.put(messageKey, message.asJSON())

    // Add message ID to mailbox label index
    for await (const label of message.labels) {
      await this.indexLabels.put(`${mailbox.id}:${label}:${messageId}`, '')
    }
  }

  async getMessageIds(
    mailbox?: Mailbox,
    folder?: ReservedLabel,
    offset?: string,
    limit?: number)
    : Promise<Array<string>> {
    const messageList = await this.indexLabels.list({
      prefix: mailbox?.id ? `${mailbox.id}:${folder ?? ReservedLabel.All}` : undefined,
      limit: limit,
      cursor: offset
    })
    return messageList.keys.map(key => key.name.split(":").at(-1)!)
  }

  async getMessagesWithMetadata(
    mailbox?: Mailbox,
    folder?: ReservedLabel,
    offset?: string,
    limit?: number)
    : Promise<MessageMetadataResponse> {
    const messages = Array<Message>()
    const messageList = await this.indexLabels.list({
      prefix: mailbox?.id ? `${mailbox.id}:${folder ?? ReservedLabel.All}` : undefined,
      limit: limit,
      cursor: offset
    })

    for await (const key of messageList.keys) {
      const [mailboxId, , messageId] = key.name.split(":")
      const messageJSON = await this.messageMetadata.get(`${mailboxId}:${messageId}`)
      const message = new Message(messageId, JSON.parse(messageJSON || '{}'))
      messages.push(message)
    }

    return {
      messages: messages,
      pagination: {
        next: messageList.list_complete === false ? messageList.cursor : null,
      }
    }
  }

  async getMessages(
    mailbox: Mailbox,
    ids: Array<string>)
    : Promise<Array<Message>> {
    const mailboxId = mailbox.id
    const messages = ids.map(async messageId => {
      const messageJSON = await this.messageMetadata.get(`${mailboxId}:${messageId}`)
      return new Message(messageId, JSON.parse(messageJSON || '{}'))
    })
    return await Promise.all(messages)
  }

  async delete(mailbox: Mailbox, messageId: string): Promise<void> {
    const messageKey = `${mailbox.id}:${messageId}`
    const messageMetadata = await this.messageMetadata.get(messageKey)
    const message = new Message(messageId, JSON.parse(messageMetadata || '{}'))

    // Delete attachment blobs - TODO
    // if (message.parts) {
    //   await Promise.all(message.parts.entries().map(async ([partId, mimePart]) => {
    //     if (mimePart.content) {
    //       await this.messageBlob.delete(`${messageKey}:${partId}`)
    //     }
    //   }) ?? [])
    // }

    // Delete message ID from labels index
    await Promise.all(message.labels.values().map(label =>
      this.indexLabels.delete(`${mailbox.id}:${label}:${messageId}`)) ?? [])

    // Delete message metadata from mailbox
    await this.messageMetadata.delete(messageKey)
  }
}
