import PostalMime from 'postal-mime'
import { Bindings } from '../../common/dao/src'
import MailStorageFactory from '../../common/dao/src/MailStorageFactory'
import Mailbox from '../../common/dao/src/models/Mailbox.model'
import Message, { ReservedLabel } from '../../common/dao/src/models/Message.model'
import MimePart from '../../common/dao/src/models/MimePart.model'

interface WorkerEnv extends Bindings {
  messageMetadata: KVNamespace
  indexLabels: KVNamespace
  messageBlob: R2Bucket
  FORWARD_EMAIL: string
}

export default {
  async email(message: ForwardableEmailMessage, env: WorkerEnv): Promise<void> {
    if (env.FORWARD_EMAIL && env.FORWARD_EMAIL.indexOf('@') != -1) {
      await message.forward(env.FORWARD_EMAIL)
      console.log('Forwarded message')
    }

    const rawEmail = new Response(message.raw)
    const messageStorage = new MailStorageFactory(env).getMailStorage()
    const messageId = messageStorage.generateId()

    try {
      const mailbox = Mailbox.fromEmail(message.to)
      const emailBuffer = await rawEmail.arrayBuffer()
      const parsedEmail = await new PostalMime().parse(emailBuffer)
      const messageMetadata = new Message(messageId, parsedEmail)
      messageMetadata.labels
        .add(ReservedLabel.All)
        .add(ReservedLabel.Inbox)
      messageMetadata.size = emailBuffer.byteLength
      messageMetadata.parts = parsedEmail.attachments?.reduce((pre, cur, i) => {
        const partId = (i + 1).toString()
        return pre.set(partId, new MimePart(partId, cur))
      }, new Map<string, MimePart>())
      await messageStorage.putMessage(mailbox, messageId, messageMetadata)
      console.log('Stored message')
    } catch (error) {
      console.log(error)
      message.setReject("Error processing message")
    }
  }
} satisfies ExportedHandler<WorkerEnv>
