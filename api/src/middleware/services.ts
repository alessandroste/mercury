import { MiddlewareHandler } from "hono"
import MailStorageFactory from "../../../common/dao/src/MailStorageFactory"
import { CloudflareClient } from "../service/cloudflare"
import { SendingService } from "../service/sending"
import { RouterEnv } from "../worker"

export const cloudflareClientMiddleware: MiddlewareHandler<RouterEnv> =
  (c, next) => {
    c.set("cloudflareClient", new CloudflareClient(c.env.CF_API_TOKEN))
    return next()
  }

export const mailStorageMiddleware: MiddlewareHandler<RouterEnv> =
  (c, next) => {
    c.set("mailStorage", new MailStorageFactory(c.env).getMailStorage())
    return next()
  }

export const sendingServiceMiddleware: MiddlewareHandler<RouterEnv> =
  (c, next) => {
    c.set("sendingService", new SendingService(c.env))
    return next()
  }
