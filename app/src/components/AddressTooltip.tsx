import { Tooltip } from "@radix-ui/themes"
import { EmailAddress } from "jmap-jam"

export const AddressTooltip = (a: EmailAddress) => {
  if (a.name) {
    return <Tooltip content={a.email}>
      <span>{a.name}</span>
    </Tooltip>
  }
  else return <span>{a.email}</span>
}
