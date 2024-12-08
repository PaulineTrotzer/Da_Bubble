export class currentThreadMessage {
  recipientId?: any;
  id?: string | undefined;
  senderName?: string;
  recipientName?: string;
  text?: string;
  senderPicture?: string;
  timestamp?: Date | { seconds: number; nanoseconds: number };
  senderId?: string;
  isHovered?: boolean;
}
