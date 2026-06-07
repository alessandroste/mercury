import { Box, Button, Card, DataList, Flex, Inset, Select, TextArea, TextField } from "@radix-ui/themes";
import { IconDeviceFloppy, IconSend, IconTrash } from "@tabler/icons-react";
import { useCallback, useContext, useState, type ChangeEvent } from "react";
import { useLoaderData, useNavigate, useRevalidator, useSearchParams } from "react-router-dom";
import { JMapClientContext } from "../JMapClientContext";
import { Email, getEmptyEmail, getEmptyEmailBodyPart } from "../model/Email";
import { IComposeData } from "../Router";
import { PARAM_ACCOUNT, PARAM_MESSAGE } from "../services/JMapClient";

export default function Compose() {
  const { accounts, email } = useLoaderData() as IComposeData
  const [, setSearchParams] = useSearchParams()
  const client = useContext(JMapClientContext)
  const revalidator = useRevalidator()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Omit<Email, 'headers'>>(() => ({
    ...(email ?? getEmptyEmail()),
    accountId: email?.accountId ?? (accounts.length > 0 ? accounts[0].id : '')
  }))

  const [prevEmail, setPrevEmail] = useState(email)
  if (prevEmail !== email) {
    setPrevEmail(email)
    setDraft(p => ({
      ...p,
      ...email,
      accountId: email?.accountId ?? (accounts.length > 0 ? accounts[0].id : '')
    }))
  }

  const readyToSend = draft.id !== ''

  const draftText = (draft.textBody ?? [])
    .map(part => part.partId)
    .filter((partId): partId is string => partId !== undefined)
    .map(partId => draft.bodyValues[partId]?.value || '').join()

  const updateDraft = (d: Partial<Omit<Email, 'headers'>>) => { setDraft(p => ({ ...p, ...d })) }

  const updateDraftText = (text: string) => {
    setDraft(p => ({
      ...p,
      bodyStructure: {
        ...p.bodyStructure,
        type: 'text/plain',
        partId: '0a'
      },
      bodyValues: {
        ...p.bodyValues,
        '0a': {
          value: text,
          isEncodingProblem: false,
          isTruncated: false
        }
      },
      textBody: [
        getEmptyEmailBodyPart('0a', text.length)
      ]
    }))
  }

  const updateDraftTo = useCallback((toLine: string) => {
    const emails = toLine.split(',').map(p => p.trim())
    updateDraft({
      to: emails.map((rawEmail: string) => ({ email: rawEmail, name: '' }))
    })
  }, [])

  const saveDraft = useCallback(async () => {
    if (email?.accountId && email?.id) {
      await client?.deleteEmail(email.accountId, email.id)
    }

    const saved = await client?.createEmail(draft)
    if (saved) {
      setSearchParams({ [PARAM_ACCOUNT]: saved.accountId, [PARAM_MESSAGE]: saved.id })
    }

    revalidator.revalidate()
  }, [client, draft, email, revalidator, setSearchParams])

  const deleteDraft = useCallback(async () => {
    if (email?.accountId && email?.id) {
      await client?.deleteEmail(email.accountId, email.id)
      setDraft(getEmptyEmail())
      setSearchParams({})
      revalidator.revalidate()
    }
  }, [client, email, revalidator, setSearchParams])

  const sendCallback = useCallback(async () => {
    if (email?.accountId && email?.id) {
      await client?.sendEmail(email.accountId, email.id)
      navigate('/')
    }
  }, [client, email, navigate])

  return (
    <Card>
      <Inset clip='padding-box' side='top' pb='current'>
        <Box width='100%' p='4' className='header'>
          <Flex gap='4'>
            <Select.Root
              value={draft.accountId}
              onValueChange={v => updateDraft({ accountId: v })}>
              <Select.Trigger placeholder="Account" />
              <Select.Content>
                {accounts.map((a, i) => (<Select.Item key={i} value={a.id}>{a.name}</Select.Item>))}
              </Select.Content>
            </Select.Root>
            <Button ml='auto' onClick={saveDraft}>
              <IconDeviceFloppy stroke={1} size={24} />Save
            </Button>
            <Button disabled={!readyToSend} onClick={sendCallback}>
              <IconSend stroke={1} size={24} />Send
            </Button>
            <Button onClick={deleteDraft}>
              <IconTrash stroke={1} size={24} />Delete
            </Button>
          </Flex>
        </Box>
      </Inset>
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>To</DataList.Label>
          <DataList.Value>
            <Box width="100%">
              <TextField.Root
                value={(draft.to ?? []).map(address => address.email).join(', ')}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateDraftTo(e.target.value)} />
            </Box>
          </DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Subject</DataList.Label>
          <DataList.Value>
            <Box width="100%">
              <TextField.Root
                value={draft.subject ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { updateDraft({ subject: e.target.value }) }} />
            </Box>
          </DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Message</DataList.Label>
          <DataList.Value>
            <Box width="100%">
              <TextArea
                value={draftText}
                style={{ height: "300px" }}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateDraftText(e.target.value)} />
            </Box>
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>
    </Card>
  )
}
