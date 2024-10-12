import { Bindings } from '.'
import { CFMailStorage } from './cloudflare/CFMailStorage'
import { MailStorage } from './MailStorage'

export default class MailStorageFactory {
  private mailStorage: MailStorage

  constructor(env: Bindings) {
    this.mailStorage = new CFMailStorage(env)
  }

  public getMailStorage() { return this.mailStorage }
}
