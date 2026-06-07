import JamClient from "jmap-jam"
import { UndoStatus } from "jmap-rfc-types"
import { LoaderFunctionArgs, Params } from "react-router-dom"
import { Email } from "../model/Email"

export const PARAM_LABEL = 'label'
export const PARAM_ACCOUNT = 'account'
export const PARAM_MESSAGE = 'message'

export type Accounts = Array<{ id: string, name: string }>
export type SettingsRoute = {
  id: string
  name: string
  enabled?: boolean
  matchers?: Array<{
    field?: string
    value?: string
  }>
  actions?: Array<{
    type?: string
    value?: string[]
  }>
}

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

  async getSettingsRoutes(): Promise<SettingsRoute[]> {
    if (this.client === undefined) return []
    const response = await fetch(`${this.endpoint.replace('/.well-known/jmap', '')}/settings/routes`, {
      method: 'GET',
      headers: {
        Authorization: this.client.authHeader,
      }
    })
    if (!response.ok) {
      throw new Error(`Unable to load routes (${response.status})`)
    }
    return await response.json() as SettingsRoute[]
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
      .flatMap((r) => r.list.map(e => ({ ...e, accountId: r.accountId }) as Email))
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

    const email = response[0]?.list[0]
    return email ? ({ ...email, accountId: accountId } as Email) : null
  }

  async deleteEmail(accountId: string, id: string): Promise<void> {
    await this.client?.api.Email.set({
      accountId: accountId,
      destroy: [id],
    })
  }

  async createEmail(email: Omit<Email, 'headers'>): Promise<Email | undefined> {
    if (!this.client || !email) return undefined
    const id = crypto.randomUUID()

    const [result] = await this.client.api.Email.set({
      accountId: email.accountId,
      destroy: [],
      create: {
        [id]: email
      }
    })

    const created = result.created?.[id]
    return created ? ({ accountId: email.accountId, ...created } as Email) : undefined
  }

  async sendEmail(accountId: string, emailId: string): Promise<void> {
    if (!this.client || !emailId) return
    const id = crypto.randomUUID()
    await this.client.api.EmailSubmission.set({
      accountId: accountId,
      create: {
        [id]: {
          emailId: emailId,
          identityId: '',
          undoStatus: UndoStatus.Pending
        }
      }
    })
  }
}
