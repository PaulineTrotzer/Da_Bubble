export class User {
    uid: string;
    name: string;
    email: string;
    password: string;
    picture?: string;
    status: string;
    lastEmojis: string[];
    lastUsedEmoji?: string;
  
    constructor(obj?: any, uid?: string) {
      this.uid = uid || obj?.uid || '';
      this.name = obj?.name || '';
      this.email = obj?.email || '';
      this.password = obj?.password || '';
      this.picture = obj?.picture || 'assets/img/picture_frame.png';
      this.status = obj?.status || '';
      this.lastEmojis = obj?.lastEmojis || ['😍', '😇'];
      this.lastUsedEmoji = obj?.lastUsedEmoji || '';
    }
  
    public toJSON() {
      return {
        uid: this.uid,
        name: this.name,
        email: this.email,
        picture: this.picture,
        status: this.status,
        lastEmojis: this.lastEmojis,
        lastUsedEmoji : this.lastUsedEmoji,
      };
    }
  }
  