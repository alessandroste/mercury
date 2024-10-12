import { CreateEmailOptions, Resend } from "resend"
import Message from "../../../common/dao/src/models/Message.model"
import { WorkerEnv } from "../env"

export class SendingService {
  private resend: Resend

  constructor(env: WorkerEnv) {
    this.resend = new Resend(env.RS_API_TOKEN)
  }

  async send(message: Message): Promise<boolean> {
    const resendMessage : CreateEmailOptions = {
      from: message.from!.address!,
      to: message.to![0].address!,
      text: message.text || "",
      html: message.html || "",
      subject: message.subject || ""
    }
    const { error } = await this.resend.emails.send(resendMessage)
    return error? false : true
  }
}
