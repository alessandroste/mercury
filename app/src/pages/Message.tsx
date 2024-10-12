import { Box, Card, DataList, Heading, Inset, ScrollArea, Skeleton } from "@radix-ui/themes"
import { useMemo } from "react"
import { useLoaderData } from "react-router-dom"
import { AddressTooltip } from "../components/AddressTooltip"
import TimeTooltip from "../components/TimeTooltip"
import { Email } from "../model/Email"

export default function Message() {
  const email = useLoaderData() as Email
  const emailSkeleton =
    <Skeleton>
      <Box
        width='100%'
        minHeight='500px'
      />
    </Skeleton>

  const bodyValue = useMemo(() =>{
    const textBodyPartId = email.textBody?.at(0)?.partId
    const htmlBodyPartId = email.htmlBody?.at(0)?.partId
    const textBodyValue = textBodyPartId ? email?.bodyValues[textBodyPartId].value : ''
    const htmlBodyValue = htmlBodyPartId ? email?.bodyValues[htmlBodyPartId].value : ''
    return htmlBodyValue ? htmlBodyValue : textBodyValue
  }, [email?.bodyValues, email.htmlBody, email.textBody])

  const emailCard = useMemo(() => (<Card>
    <Inset clip='padding-box' side='top' pb='current'>
      <Box width='100%' p='4' className='header'>
        <Box pb='4'>
          <Heading as='h1'>{email.subject}</Heading>
        </Box>
        <DataList.Root>
          <DataList.Item key={0}>
            <DataList.Label>Date</DataList.Label>
            <DataList.Value>
              <TimeTooltip time={email.receivedAt} />
            </DataList.Value>
          </DataList.Item>
          <DataList.Item key={1}>
            <DataList.Label>From</DataList.Label>
            <DataList.Value>
              {email.from?.map(AddressTooltip)}
            </DataList.Value>
          </DataList.Item>
          <DataList.Item key={2}>
            <DataList.Label>To</DataList.Label>
            <DataList.Value>
              {email.to?.map(AddressTooltip)}
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Box>
    </Inset>
    <ScrollArea type="always" scrollbars="vertical" style={{ height: 500 }}>
      <div dangerouslySetInnerHTML={{ __html: bodyValue }} />
    </ScrollArea>
  </Card>), [bodyValue, email.from, email.receivedAt, email.subject, email.to])

  return email ? emailCard : emailSkeleton
}
