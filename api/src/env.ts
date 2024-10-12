import { Bindings } from "../../common/dao/src"

export interface WorkerEnv extends Bindings {
  CF_API_TOKEN: string
  RS_API_TOKEN: string
  HOST_APP: string,
  AUTH_CLIENT_ID: string,
  AUTH_ALLOWED: string
}
