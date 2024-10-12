import Cloudflare from "cloudflare";
import { EmailRoutingRule } from "cloudflare/resources/email-routing/rules/rules.mjs";

export class CloudflareClient {
  private client: Cloudflare

  constructor(token: string) {
    this.client = new Cloudflare({
      apiToken: token,
    })
  }

  async getWorkerRoutes(): Promise<EmailRoutingRule[]> {
    const zones = await this.client.zones.list()
    const zone = zones.result[0]
    const routes = await this.client.emailRouting.rules.list({ zone_id: zone.id })
    return routes.result
      .filter(r => r.actions?.some(a => a.type === "worker") &&
        r.matchers?.at(0)?.value)
  }
}
