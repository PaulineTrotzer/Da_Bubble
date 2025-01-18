export interface SendMessageInfo {
  formattedText?: any;
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPicture?: string;
  recipientId: string;
  recipientName: string;
  timestamp: Date;
  senderSticker?: string;
  senderStickerCount?: number;
  recipientSticker?: string;
  recipientStickerCount?: number;
  senderchoosedStickereBackColor?: string | null;
  recipientChoosedStickerBackColor?: string | null;
  stickerBoxCurrentStyle?: any;
  stickerBoxOpacity?: any;
  selectedFiles?: any[];
  editedTextShow?:boolean;
  reactions?: { [emoji: string]: any }; 
  isParent?: boolean | false,
  parentThreadId?: string | null;

}
