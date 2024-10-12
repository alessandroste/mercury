import Base from "./Base.model"

/**
 * Representation of a MIME part which is referenced from and belongs to a
 * MIME Message.
 */
class MimePart extends Base {
  /**
   * Multipart and nested multipart messages are assigned consecutive part numbers,
   * as they occur in the message as per the IMAP4 specification (e.g. "2" or "3.1").
   */
  size?: number
  filename?: string | null
  mimeType?: string
  contentId?: string
  disposition!: "attachment" | "inline" | null
  content?: string | ArrayBuffer

  public constructor(id: string, init?: Partial<MimePart>) {
    super()
    this.id = id
    this.contentId = init?.contentId
    this.mimeType = init?.mimeType
    this.disposition = init?.disposition || null
    this.filename = init?.filename
    this.content = init?.content

    if (this.content instanceof String) {
      this.size = this.content.length
    } else if (this.content instanceof ArrayBuffer) {
      this.size = this.content.byteLength
    } else {
      this.size = 0
    }
  }
}

export default MimePart
