import { EmailBodyPart, Email as JEmail } from 'jmap-jam'

export type Email = JEmail & {
  accountId: string
}

export const getEmptyEmailBodyPart = (partId: string, size: number) : EmailBodyPart => ({
  partId: partId,
  size: size,
  blobId: null,
  headers: [],
  name: null,
  type: '',
  charset: null,
  disposition: null,
  cid: null,
  language: null,
  location: null,
  subParts: null
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
  messageId: null,
  inReplyTo: null,
  sender: null,
  from: null,
  to: null,
  references: null,
  cc: null,
  bcc: null,
  replyTo: null,
  subject: null,
  sentAt: null,
  bodyStructure: getEmptyEmailBodyPart('', 0),
  bodyValues: {},
  textBody: [],
  htmlBody: [],
  attachments: [],
  hasAttachment: false,
  preview: ''
})
