import { Tooltip } from "@radix-ui/themes"
import type { EmailAddress } from "jmap-rfc-types"

export const AddressTooltip = (a: EmailAddress) => {
  if (a.name) {
    return <Tooltip content={a.email}>
      <span>{a.name}</span>
    </Tooltip>
  }
  else return <span>{a.email}</span>
}
