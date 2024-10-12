import { Tooltip } from "@radix-ui/themes"

export type Props = {
  time: string
}

export default function TimeTooltip({ time }: Props) {
  return (
    <Tooltip content={time}>
      <span>
        {new Date(time).toLocaleString()}
      </span>
    </Tooltip>)
}
