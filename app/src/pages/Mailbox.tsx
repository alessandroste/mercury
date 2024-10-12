import { Box, Button, DropdownMenu, Flex, SegmentedControl, Skeleton, Table } from "@radix-ui/themes"
import { IconDotsVertical, IconTrash } from "@tabler/icons-react"
import { EmailAddress } from "jmap-jam"
import { Suspense, useCallback, useContext, useMemo } from "react"
import { Await, useLoaderData, useRevalidator, useSearchParams } from "react-router-dom"
import { AddressTooltip } from "../components/AddressTooltip"
import RouteLink from "../components/RouteLink"
import TimeTooltip from "../components/TimeTooltip"
import { JMapClientContext } from "../JMapClientContext"
import { Email } from "../model/Email"
import { PARAM_LABEL } from "../services/JMapClient"

export default function Mailbox() {
  const [searchParams, setSearchParams] = useSearchParams()
  const loaderData = useLoaderData() as {emails: Promise<Email[]>}
  const client = useContext(JMapClientContext)
  const revalidator = useRevalidator()

  const switchMailbox = useCallback((m: string) => () => {
    setSearchParams({ [PARAM_LABEL]: m })
    revalidator.revalidate()
  }, [revalidator, setSearchParams])

  const getMessageRouteLink = useCallback((e: Email) => {
    return Object.keys(e.mailboxIds).includes('2') ?
      `compose?account=${e.accountId}&message=${e.id}` :
      `account/${e.accountId}/message/${e.id}`
  }, [])

  const getLabelOrDefault = useMemo(() => searchParams.get(PARAM_LABEL) || "1", [searchParams])

  const mailboxSwitcher = useMemo(() => (
    <SegmentedControl.Root style={{ marginLeft: 'auto' }} defaultValue={getLabelOrDefault}>
      <SegmentedControl.Item value="1" onClick={switchMailbox("1")}>
        Inbox
      </SegmentedControl.Item>
      <SegmentedControl.Item value="2" onClick={switchMailbox("2")}>
        Drafts
      </SegmentedControl.Item>
      <SegmentedControl.Item value="3" onClick={switchMailbox("3")}>
        Sent
      </SegmentedControl.Item>
      <SegmentedControl.Item value="4" onClick={switchMailbox("4")}>
        Deleted
      </SegmentedControl.Item>
      <SegmentedControl.Item value="0" onClick={switchMailbox("0")}>
        All
      </SegmentedControl.Item>
    </SegmentedControl.Root>
  ), [getLabelOrDefault, switchMailbox])

  const toolbar = useMemo(() => (
    <Flex width='100%' pb='4' justify='center'>
      <Box>
        {mailboxSwitcher}
      </Box>
    </Flex>
  ), [mailboxSwitcher])

  const getAddress = (e: EmailAddress | undefined) =>
    e === undefined ? <></> : AddressTooltip(e)

  const tableBody = (emails: Email[]) => (
    <Table.Body>
      {emails.map(e => (
        <Table.Row key={e.id}>
          <Table.RowHeaderCell>
            <TimeTooltip time={e.receivedAt} />
          </Table.RowHeaderCell>
          <Table.Cell><RouteLink to={getMessageRouteLink(e)}>{e.subject}</RouteLink></Table.Cell>
          <Table.Cell>{getAddress(e.from?.at(0))}</Table.Cell>
          <Table.Cell>{getAddress(e.to?.at(0))}</Table.Cell>
          <Table.Cell>
            <DropdownMenu.Root key='3'>
              <DropdownMenu.Trigger>
                <Button variant='ghost'>
                  <IconDotsVertical size='16' />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item color='red' onClick={async () => {
                  await client?.deleteEmail(e.accountId, e.id)
                  revalidator.revalidate()
                }}>
                  <IconTrash size={24} stroke={1} />Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  )

  return (
    <Box width='100%'>
      {toolbar}
      <Suspense fallback={
        <Skeleton height='300px'/>
      }>
        <Await
          resolve={loaderData.emails}>
          {emails => (
            < Table.Root variant='surface'>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Time</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Subject</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>From</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>To</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              {tableBody(emails)}
            </Table.Root>
          )}
        </Await>
      </Suspense>
    </Box >
  )
}
