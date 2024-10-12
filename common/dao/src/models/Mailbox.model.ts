import { InvalidEmailError } from "../errors";

/**
 * This class is the representation of mailbox object. Each mailbox uniquely
 * identified by RFC5322 compatible email address.
 *
 * @see <a href="http://tools.ietf.org/html/rfc5322">RFC5322</a>
 */
export default class Mailbox {
  public readonly id: string;

  /**
   * Derive unique Mailbox ID from account and domain name.
   *
   * @param account Account name
   * @param domain Domain name
   */
  constructor(account: string, domain: string) {
    // use email as mailbox id
    const email = `${account}@${domain}`
    this.id = email.toLowerCase();
  }

  static fromEmail(email: string): Mailbox {
    if (email.indexOf('@') === -1) throw new InvalidEmailError()
    const [account, domain] = email.split('@')
    return new Mailbox(account, domain)
  }
}
