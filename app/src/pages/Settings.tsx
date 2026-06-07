import { Box, Callout, Skeleton, Table } from "@radix-ui/themes"
import { IconInfoCircle } from "@tabler/icons-react"
import { useContext, useEffect, useMemo, useState } from "react"
import { JMapClientContext } from "../JMapClientContext"
import { SettingsRoute } from "../services/JMapClient"

export default function Settings() {
  const client = useContext(JMapClientContext)
  const [routes, setRoutes] = useState<SettingsRoute[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false

    const loadRoutes = async () => {
      if (!client) {
        setRoutes([])
        return
      }

      setIsLoading(true)
      setError(undefined)
      try {
        const loadedRoutes = await client.getSettingsRoutes()
        if (!cancelled) {
          setRoutes(loadedRoutes)
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Unable to load routes'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadRoutes()
    return () => { cancelled = true }
  }, [client])

  const tableBody = useMemo(() => (
    <Table.Body>
      {routes.map((route) => {
        const recipient = route.matchers?.find((matcher) => matcher.field === 'to')?.value ?? '-'
        const action = route.actions?.find((candidate) => candidate.type === 'worker')?.value?.join(', ') ?? '-'
        return (
          <Table.Row key={route.id}>
            <Table.RowHeaderCell>{recipient}</Table.RowHeaderCell>
            <Table.Cell>{action}</Table.Cell>
            <Table.Cell>{route.name}</Table.Cell>
            <Table.Cell>{route.enabled === false ? 'Disabled' : 'Enabled'}</Table.Cell>
          </Table.Row>
        )
      })}
    </Table.Body>
  ), [routes])

  return (
    <Box width={"100%"}>
      {error && (
        <Callout.Root color='red' mb='4'>
          <Callout.Icon>
            <IconInfoCircle />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      <Table.Root variant='surface'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Recipient</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        {isLoading ? (
          <Table.Body>
            <Table.Row>
              <Table.Cell colSpan={4}>
                <Skeleton height='20px' />
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        ) : tableBody}
      </Table.Root>
    </Box>
  )
}
