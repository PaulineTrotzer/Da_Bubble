export class ChannelMessage {
    text: string;
    senderId: string;
    senderName: string;
    senderPicture: string;
    timestamp: Date;
    selectedFiles: any[];
    editedTextShow: boolean;
  
    constructor(obj?: any) {
      this.text = obj?.text || '';
      this.senderId = obj?.senderId || '';
      this.senderName = obj?.senderName || '';
      this.senderPicture = obj?.senderPicture || '';
      this.timestamp = obj?.timestamp || new Date();
      this.selectedFiles = obj?.selectedFiles || [];
      this.editedTextShow = obj?.editedTextShow || false;
    }
  
    public toJSON() {
      return {
        text: this.text,
        senderId: this.senderId,
        senderName: this.senderName,
        senderPicture: this.senderPicture,
        timestamp: this.timestamp,
        selectedFiles: this.selectedFiles,
        editedTextShow: this.editedTextShow,
      };
    }
  }
  