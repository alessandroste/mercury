import type { EmailBodyPart, Email as JEmail, WithoutHeaders } from 'jmap-rfc-types'

export type Email = WithoutHeaders<JEmail> & {
  accountId: string
}

export const getEmptyEmailBodyPart = (partId: string, size: number) : EmailBodyPart => ({
  partId: partId,
  size: size,
  headers: [],
  type: ''
})

export const getEmptyEmail = (): Omit<Email, 'headers'> => ({
  accountId: '',
  id: '',
  blobId: '',
  threadId: '',
  mailboxIds: {},
  keywords: {},
  size: 0,
  receivedAt: '',
  messageId: undefined,
  inReplyTo: undefined,
  sender: undefined,
  from: undefined,
  to: undefined,
  references: undefined,
  cc: undefined,
  bcc: undefined,
  replyTo: undefined,
  subject: undefined,
  sentAt: undefined,
  bodyStructure: getEmptyEmailBodyPart('', 0),
  bodyValues: {},
  textBody: [],
  htmlBody: [],
  attachments: [],
  hasAttachment: false,
  preview: ''
})
