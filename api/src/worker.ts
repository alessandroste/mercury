import { fromHono, OpenAPIRouterType } from 'chanfana'
import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import { Variables } from 'hono/types'
import { MailStorage } from '../../common/dao/src/MailStorage'
import oauth2Html from './docs/oauth2-redirect.html'
import { getSwaggerUI } from './docs/swaggerui'
import { WorkerEnv } from './env'
import { AddMessage, DeleteMessage, GetMessage, ListMessages, UpdateMessage } from './handlers/email'
import { GetSession, HandleJmap } from './handlers/jmap'
import { UpdateRoute as CreateRoute, GetRoutes } from './handlers/settings'
import { aadJwtValidator } from './middleware/auth'
import { cloudflareClientMiddleware, mailStorageMiddleware, sendingServiceMiddleware } from './middleware/services'
import { CloudflareClient } from './service/cloudflare'
import { SendingService } from './service/sending'

export type RouterEnv = {
  Bindings: WorkerEnv
  Variables: Variables & {
    cloudflareClient: CloudflareClient
    mailStorage: MailStorage
    sendingService: SendingService
  }
}

const baseRouter = new Hono<RouterEnv>()
const router = fromHono(baseRouter, {
  docs_url: null,
  redoc_url: null,
  schema: {
    info: {
      title: 'Mercury REST API',
      version: '1.0.0'
    },
    security: [{
      oauth2: [
        "openid",
        "profile"
      ]
    }]
  }
})

const openApiRouter: OpenAPIRouterType<Hono<RouterEnv>> = router
openApiRouter.registry.registerComponent(
  'securitySchemes',
  'oauth2',
  {
    type: 'oauth2',
    'x-tokenName': 'id_token',
    flows: {
      authorizationCode: {
        authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scopes: {
          openid: 'openid',
          profile: 'profile'
        }
      }
    }
  })

baseRouter.get('/docs', (c) => new Response(
  getSwaggerUI('/openapi.yaml', c.env.AUTH_CLIENT_ID.split(',')[0]),
  { headers: { 'content-type': 'text/html; charset=UTF-8' }, status: 200 }))

baseRouter.get('/oauth2-redirect.html', () => new Response(
  oauth2Html,
  { headers: { 'content-type': 'text/html; charset=UTF-8' }, status: 200 }))

const jwtHandler = aadJwtValidator<RouterEnv>({
  validAudiences: (e: WorkerEnv) => e.AUTH_CLIENT_ID.split(','),
  validIdentities: (e: WorkerEnv) => e.AUTH_ALLOWED.split(',')
})

// Injections
baseRouter.use(
  cloudflareClientMiddleware,
  mailStorageMiddleware,
  sendingServiceMiddleware)

// Security
const authenticatedMethods = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'GET'
]
const authenticatedPaths = [
  '/.well-known/jmap',
  '/jmap',
  '/domains/*',
  '/settings/*',
]
baseRouter.on(authenticatedMethods, authenticatedPaths, jwtHandler)

// CORS
const corsHandler = cors({
  origin: (_origin, c: Context<RouterEnv>) => c.env.HOST_APP,
  credentials: true,
  allowHeaders: ['Authorization', 'Content-Type']
})
baseRouter.use('*', (c: Context<RouterEnv>, next) =>
  c.env.HOST_APP ? corsHandler(c, next) : next())

// Jmap
router.get('/.well-known/jmap', GetSession)
router.post('/jmap', HandleJmap)

// Email
router.get('/domains/:domain/accounts/:account/mailbox/messages', ListMessages)
router.get('/domains/:domain/accounts/:account/mailbox/messages/:messageId', GetMessage)
router.post('/domains/:domain/accounts/:account/mailbox/messages', AddMessage)
router.post('/domains/:domain/accounts/:account/mailbox/messages/:messageId', UpdateMessage)
router.delete('/domains/:domain/accounts/:account/mailbox/messages/:messageId', DeleteMessage)

// Settings
router.get('/settings/routes', GetRoutes)
router.post('/settings/routes', CreateRoute)

// 404 for everything else
router.all('*', () => new Response('Not Found', { status: 404 }))

export default router
