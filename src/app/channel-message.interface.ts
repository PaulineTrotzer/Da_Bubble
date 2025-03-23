export interface Message {
    formattedText: any;
    id: string;
    senderId: string;
    text: string;
    timestamp: Date;
    senderName: string;
    senderPicture: string;
    recipientId?: string;
    recipientName?: string; 
    recipientPicture?: string;
    reactions: { [emoji: string]: string[] };
    selectedFiles?: any[];
    isEdited: boolean;
  }