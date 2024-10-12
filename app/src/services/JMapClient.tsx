import JamClient, { UndoStatus } from "jmap-jam"
import { LoaderFunctionArgs, Params } from "react-router-dom"
import { Email } from "../model/Email"

export const PARAM_LABEL = 'label'
export const PARAM_ACCOUNT = 'account'
export const PARAM_MESSAGE = 'message'

export type Accounts = Array<{ id: string, name: string }>

export default class JMapClient {
  private endpoint = `${import.meta.env.VITE_HOST_FUN}/.well-known/jmap`
  private client?: JamClient = undefined

  constructor(token: string | undefined) {
    this.setAuth(token)
  }

  setAuth(token: string | undefined) {
    if (token && this.client) {
      this.client.authHeader = `Bearer ${token}`
    } else if (token) {
      this.client = new JamClient({
        sessionUrl: this.endpoint,
        bearerToken: token
      })
    } else {
      this.client = undefined
    }
  }

  async getAccounts(): Promise<Accounts> {
    if (this.client === undefined) return []
    const primaryAccount = await this.client.getPrimaryAccount()
    const accounts = (await this.client.session).accounts
    return [{
      id: primaryAccount,
      name: accounts[primaryAccount].name
    },
    ...Object.entries(accounts)
      .filter(([i]) => i !== primaryAccount)
      .map(([id, a]) => ({ id: id, name: a.name }))
    ]
  }

  async getEmails({ request }: LoaderFunctionArgs): Promise<Email[]> {
    if (this.client === undefined) return []
    const client = this.client
    const queryParams = new URL(request.url).searchParams
    const label = queryParams.get(PARAM_LABEL) ?? '1'
    const accounts = Object.keys((await this.client.session).accounts)
    const emailRequests = accounts.map(async a => {
      const [r1] = await client.api.Email.query({ accountId: a, filter: { inMailbox: label } })
      const [r2] = await client.api.Email.get({ accountId: a, ids: r1.ids })
      return r2
    }, this)
    return (await Promise.all(emailRequests))
      .flatMap((r) => r.list.map(e => ({ ...e, accountId: r.accountId })))
  }

  async getEmail(params: Params): Promise<Email | null> {
    const accountId = params['aid']
    const mailId = params['mid']
    if (!this.client || !accountId || !mailId) return null
    const response = await this.client.api.Email.get({
      accountId: accountId,
      ids: [mailId],
      fetchHTMLBodyValues: true,
      fetchTextBodyValues: true
    })

    return ({ ...response[0]?.list[0], accountId: accountId })
  }

  async deleteEmail(accountId: string, id: string): Promise<void> {
    await this.client?.api.Email.set({
      accountId: accountId,
      destroy: [id],
      ifInState: null,
      create: null,
      update: null,
    })
  }

  async createEmail(email: Omit<Email, 'headers'>): Promise<Email | undefined> {
    if (!this.client || !email) return undefined
    const id = crypto.randomUUID()

    const [result] = await this.client.api.Email.set({
      accountId: email.accountId,
      destroy: [],
      ifInState: null,
      update: null,
      create: {
        [id]: email
      }
    })

    return result.created ? { accountId: email.accountId, ...result.created[id] } : undefined
  }

  async sendEmail(accountId: string, emailId: string): Promise<void> {
    if (!this.client || !emailId) return
    const id = crypto.randomUUID()
    await this.client.api.EmailSubmission.set({
      accountId: accountId,
      ifInState: null,
      create: {
        [id]: {
          id: id,
          emailId: emailId,
          sendAt: '',
          identityId: '',
          threadId: '',
          envelope: null,
          undoStatus: "pending" as UndoStatus,
          deliveryStatus: null,
          dsnBlobIds: [],
          mdnBlobIds: []
        }
      },
      update: null,
      destroy: null
    })
  }
}
