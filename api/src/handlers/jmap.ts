import { OpenAPIRoute } from "chanfana"
import { Context } from "hono"
import { HTTPException } from "hono/http-exception"
import { Account, Invocation, Methods, Request, Requests, Session } from "jmap-jam"
import { z } from "zod"
import { InvalidEmailError } from "../../../common/dao/src/errors"
import { MailboxService } from "../service/mailbox"
import { ZodInferSchema } from "../utils/zod"
import { RouterEnv } from "../worker"

type Capability =
  "urn:ietf:params:jmap:mail" | string

type Accounts = { [id: string]: Account<Capability> }

export class GetSession extends OpenAPIRoute {
  schema = {
    tags: ['Jmap']
  }
  async handle(c: Context<RouterEnv>) {
    const user = c.get("jwtPayload")
    const cfClient = c.get("cloudflareClient")
    const routes = await cfClient.getWorkerRoutes()
    const accounts = routes.reduce<Accounts>((c, r) => {
      const email = r.matchers?.at(0)?.value
      if (!email) return c
      return ({
        ...c,
        [Buffer.from(email).toString('base64url')]: {
          name: email,
          isPersonal: true,
          isReadOnly: false,
          accountCapabilities: {
            "urn:ietf:params:jmap:mail": {}
          }
        }
      })
    }, {})

    const host = c.env.HOST_APP ? new URL(c.req.url).origin : ''
    const session: Session<Capability> = {
      capabilities: {
        "urn:ietf:params:jmap:core": {
          maxSizeUpload: 50000000,
          maxConcurrentUpload: 4,
          maxSizeRequest: 10000000,
          maxConcurrentRequests: 4,
          maxCallsInRequest: 16,
          maxObjectsInGet: 500,
          maxObjectsInSet: 500,
          collationAlgorithms: [
            "i;ascii-numeric",
            "i;ascii-casemap",
            "i;unicode-casemap"
          ]
        },
        "urn:ietf:params:jmap:mail": {}
      },
      accounts: accounts,
      primaryAccounts: {
        "urn:ietf:params:jmap:mail": Object.keys(accounts)[0]
      },
      apiUrl: `${host}/jmap`,
      username: user.preferred_username,
      downloadUrl: "",
      uploadUrl: "",
      eventSourceUrl: "",
      state: "12345"
    }

    return c.json(session)
  }
}

const requestSchema = z.object<ZodInferSchema<Request<Invocation<Record<string, unknown>>[]>>>({
  using: z.array(z.string()),
  methodCalls: z.array(z.tuple([
    z.custom<Methods>((v) => (v as Methods)),
    z.record(z.string(), z.unknown()),
    z.string(),
  ])),
  createdIds: z.record(z.string(), z.string()).optional()
})

export class HandleJmap extends OpenAPIRoute {
  schema = {
    tags: ['Jmap'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: requestSchema
          }
        }
      }
    }
  }

  async handle(c: Context<RouterEnv>) {
    const data = await this.getValidatedData<typeof this.schema>()
    const mailboxService = new MailboxService(
      c.get('mailStorage'), c.get('sendingService'))

    try {
      const processRequest = (method: Methods, params: Record<string, unknown>) => {
        switch (method) {
          case 'Mailbox/get':
            return mailboxService.getMailbox(params as Requests[typeof method])
          case 'Email/get':
            return mailboxService.getEmail(params as Requests[typeof method])
          case 'Email/query':
            return mailboxService.queryEmail(params as Requests[typeof method])
          case 'Email/set':
            return mailboxService.setEmail(params as Requests[typeof method])
          case 'EmailSubmission/set':
            return mailboxService.setEmailSubmission(params as Requests[typeof method])
        }
      }

      const methodResponses = await Promise.all(data.body.methodCalls.map(
        async ([method, params, cid]) => {
          const response = await processRequest(method as Methods, params)
          return [method, response, cid]
        }))

      return c.json({
        sessionState: '',
        createdIds: {},
        methodResponses: methodResponses
      })
    } catch (e: unknown) {
      if (e instanceof InvalidEmailError) throw new HTTPException(400, { message: 'Invalid email' })
      throw e
    }
  }
}
