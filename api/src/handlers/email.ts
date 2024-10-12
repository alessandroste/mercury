import { OpenAPIRoute } from 'chanfana'
import { Context } from 'hono'
import { PaginationOf, Paginator, Serializer } from 'ts-japi'
import { z } from 'zod'
import MailStorageFactory from '../../../common/dao/src/MailStorageFactory'
import Mailbox from '../../../common/dao/src/models/Mailbox.model'
import Message, { ReservedLabel } from '../../../common/dao/src/models/Message.model'
import { RouterEnv } from '../worker'

const zodMessageContract = z.object({
  type: z.string(),
  id: z.string().uuid(),
  attributes: z.object({
    from: z.object({
      address: z.string(),
      name: z.string()
    }),
    to: z.object({
      address: z.string(),
      name: z.string()
    }),
    subject: z.string(),
    date: z.date(),
    labels: z.array(z.number())
  }),
})

export class ListMessages extends OpenAPIRoute {
  schema = {
    tags: ['Messages'],
    summary: 'List all messages in the mailbox',
    request: {
      params: z.object({
        domain: z.string().describe('Domain'),
        account: z.string().describe('Account'),
      }),
      query: z.object({
        offset: z.string().describe('Pagination start position (aka offset)').optional(),
        limit: z.number().describe('Pagination limit (default 50)').optional().default(50),
      })
    },
    responses: {
      '200': {
        description: 'List of the messages',
        content: {
          'application/json': {
            schema: z.object({
              version: z.string(),
              links: z.object({
                next: z.string()
              }),
              data: z.array(zodMessageContract)
            })
          },
        }
      }
    }
  }

  async handle(c: Context<RouterEnv>) {
    const data = await this.getValidatedData<typeof this.schema>()
    const mailbox = new Mailbox(data.params.account, data.params.domain)
    const messageStorage = new MailStorageFactory(c.env).getMailStorage()
    const messagesData = await messageStorage.getMessagesWithMetadata(mailbox, ReservedLabel.Inbox, data.query?.offset, data.query?.limit)

    const MessagePaginator = new Paginator<Message>(() => {
      if (messagesData.pagination.next) {
        const nextURL = new URL(c.req.url)
        nextURL.searchParams.set("offset", messagesData.pagination.next)
        nextURL.searchParams.set("limit", data.query.limit.toString())

        const pagination: PaginationOf<string> = { // using any due to the conflict between URL and string
          next: nextURL.toString(),
          first: undefined,
          last: undefined,
          prev: undefined
        }

        return pagination
      }
    })

    const messageSerializer = new Serializer<Message>('message', {
      linkers: {
        paginator: MessagePaginator
      }
    })

    const jsonApiResponse = await messageSerializer.serialize(messagesData.messages)
    return Response.json(jsonApiResponse, { status: 200 })
  }
}

export class GetMessage extends OpenAPIRoute {
  schema = {
    tags: ['Messages'],
    summary: 'Get parsed message',
    request: {
      params: z.object({
        domain: z.string().describe('Domain'),
        account: z.string().describe('Account'),
        messageId: z.string().describe('Message ID'),
      })
    },
    responses: {
      '200': {
        description: 'Message',
        content: {
          'application/json': {
            schema: z.object({
              version: z.string(),
              links: z.object({
                next: z.string()
              }),
              data: zodMessageContract
            })
          },
        }
      },
    },
  }

  async handle(c: Context<RouterEnv>) {
    const data = await this.getValidatedData<typeof this.schema>()
    const mailbox = new Mailbox(data.params.account, data.params.domain)
    const messageStorage = new MailStorageFactory(c.env).getMailStorage()
    const message = await messageStorage.getMessage(mailbox, data.params.messageId)
    const MessageSerializer = new Serializer<Message>('message')
    const jsonApiResponse = await MessageSerializer.serialize(message)
    return Response.json(jsonApiResponse, { status: 200 })
  }
}

export class AddMessage extends OpenAPIRoute {
  schema = {
    tags: ['Messages'],
    summary: 'Add a message',
    description: 'Add a message to the mailbox. Content type should be `application/octet-stream` and request body should contain email in RFC5322 format.',
    request: {
      params: z.object({
        domain: z.string({
          description: 'Domain',
        }),
        account: z.string({
          description: 'Account',
        }),
      })
    },
    responses: {
      '201': {
        description: '',
        content: {
          'application/octet-stream': {
            schema: z.object({
              data: z.object({
                id: z.string()
              }),
            }),
          }
        }

      },
    },
  }

  async handle(c: Context<RouterEnv>) {
    const data = await this.getValidatedData<typeof this.schema>()
    const mailbox = new Mailbox(data.params.account, data.params.domain)
    const messageStorage = new MailStorageFactory(c.env).getMailStorage()
    const messageId = messageStorage.generateId()

    const messageMetadata = new Message(messageId)
    messageMetadata.labels.add(ReservedLabel.All).add(ReservedLabel.Inbox)

    // await messageStorage.put(mailbox, messageId, messageMetadata, c.req.arrayBuffer())
    return Response.json({ 'data': { 'id': messageId } }, { status: 201 })
  }
}

export class UpdateMessage extends OpenAPIRoute {
  schema = {
    tags: ['Messages'],
    summary: 'Update a message',
    request: {
      params: z.object({
        domain: z.string({
          description: 'Domain',
        }),
        account: z.string({
          description: 'Account',
        }),
        messageId: z.string({
          description: 'Existing MessageID',
        }),
      })
    },
    // TODO: Uncomment when this issue is fixed: https://github.com/cloudflare/itty-router-openapi/issues/64
    // requestBody: {
    //     contentType: 'application/octet-stream'
    // },
    responses: {
      '201': {
        description: '',
        content: {
          'application/json': {
            schema: z.object({
              data: z.object({
                id: z.string().uuid()
              }),
            }),
          }
        }
      },
    },
  }

  async handle(c: Context<RouterEnv>) {
    const data = await this.getValidatedData<typeof this.schema>()
    const messageId = data.params.messageId
    const messageMetadata = new Message(messageId)

    const mailbox = new Mailbox(data.params.account, data.params.domain)
    const messageStorage = new MailStorageFactory(c.env).getMailStorage()
    // await messageStorage.put(mailbox, messageId, messageMetadata, c.req.arrayBuffer())

    return Response.json({ 'data': { 'id': messageId } }, { status: 201 })
  }
}

export class DeleteMessage extends OpenAPIRoute {
  schema = {
    tags: ['Messages'],
    summary: 'Delete a message',
    request: {
      params: z.object({
        domain: z.string({
          description: 'Domain',
        }),
        account: z.string({
          description: 'Account',
        }),
        messageId: z.string({
          description: 'Existing MessageID',
        }),
      }),
    },
    responses: {
      '204': {
        description: ''
      },
    },
  }

  async handle(c: Context<RouterEnv>) {
    const data = await this.getValidatedData<typeof this.schema>()
    const messageId = data.params.messageId
    const mailbox = new Mailbox(data.params.account, data.params.domain)
    const messageStorage = new MailStorageFactory(c.env).getMailStorage()
    await messageStorage.delete(mailbox, messageId)
    return new Response("", { status: 204 })
  }
}
