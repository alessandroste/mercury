import { Env, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { verify } from "hono/jwt"
import { decodeBase64Url } from "hono/utils/encode"
import { SignatureAlgorithm } from "hono/utils/jwt/jwa"
import { JwtTokenExpired } from "hono/utils/jwt/types"

const OID_CONFIG_URL = 'https://login.microsoftonline.com/common/discovery/v2.0/keys'

interface OpenIDKey extends JsonWebKey {
  kid: string
}

interface JWTHeader {
  alg: SignatureAlgorithm
  kid: string
}

type Validator<T extends Env> = string[] | ((e: T["Bindings"]) => string[])

interface IValidatorOptions<T extends Env> {
  validIssuers?: Validator<T>
  validAudiences?: Validator<T>
  validIdentities?: Validator<T>
}

async function getKeys() {
  const openIdConfiguration = await fetch(OID_CONFIG_URL, { cf: { cacheTtl: 60 } })
  const { keys } = (await openIdConfiguration.json()) as { keys: OpenIDKey[] }
  return keys
}

function validateParam<T extends Env>(
  env: T["Bindings"],
  value: string,
  validator?: Validator<T>)
  : boolean {
  if (!validator) return true
  return validator instanceof Function ?
    validator(env).includes(value) :
    validator.includes(value)
}

export function aadJwtValidator<T extends Env>(options: IValidatorOptions<T>)
  : MiddlewareHandler<T> {
  const { validIssuers, validAudiences, validIdentities } = options
  const decoder = new TextDecoder()
  return async (c, next) => {
    const jwt = c.req.header('Authorization')?.replace(/^Bearer /i, '')
    if (!jwt) {
      throw new HTTPException(401, { message: 'Missing token' })
    }

    try {
      const headerString = decoder.decode(decodeBase64Url(jwt.split(".")[0]))
      const header: JWTHeader = JSON.parse(headerString)
      const keys = await getKeys()
      const matchingKey = keys.find(key => key.kid === header.kid)
      if (!matchingKey) {
        throw new Error()
      }

      const payload = await verify(jwt, matchingKey, header.alg)
      if (!validateParam(c.env, payload["iss"] as string, validIssuers)) {
        throw new HTTPException(401, { message: "Invalid issuer" })
      }

      if (!validateParam(c.env, payload["aud"] as string, validAudiences)) {
        throw new HTTPException(401, { message: "Invalid audience" })
      }

      if (!validateParam(c.env, payload["oid"] as string, validIdentities)) {
        throw new HTTPException(401, { message: "Invalid identity" })
      }

      c.set("jwtPayload", payload)
    } catch (e) {
      if (e instanceof JwtTokenExpired) {
        throw new HTTPException(401, { message: "Expired token" })
      }

      if (e instanceof HTTPException) {
        throw e
      }

      throw new HTTPException(401, { message: "Invalid token" })
    }

    await next()
  }
}
