import { OpenAPIRoute } from "chanfana"
import Cloudflare from "cloudflare"
import { Context } from "hono"
import { RouterEnv } from "../worker"
import { z } from "zod"

export class GetRoutes extends OpenAPIRoute {
  schema = {
    tags: ["Settings"]
  }
  async handle(c: Context<RouterEnv>) {
    const client = c.get("cloudflareClient")
    const routes = await client.getWorkerRoutes()
    return c.json(routes)
  }
}

export class UpdateRoute extends OpenAPIRoute {
  schema = {
    tags: ["Settings"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              email: z.string()
            })
          }
        }
      }
    }
  }
  async handle(c: Context<RouterEnv>) {
    const cloudflare = new Cloudflare({
      apiToken: c.env.CF_API_TOKEN,
    })

    const data = await this.getValidatedData<typeof this.schema>()
    const id = crypto.randomUUID()
    const zones = await cloudflare.zones.list()
    const zone = zones.result[0]
    await cloudflare.emailRouting.rules.create(
      zone.id,
      {
        name: `Route ${id}`,
        actions: [
          {
            type: "worker",
            value: [
              "mercury-mda"
            ]
          }
        ],
        matchers: [
          {
            type: "literal",
            field: "to",
            value: data.body.email
          }
        ]
      })

    c.res = new Response(null, { status: 200 })
  }
}
