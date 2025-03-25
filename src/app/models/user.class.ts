export class User {
  uid: string;
  name: string;
  username: string;
  email: string;
  password: string;
  picture?: string;
  status: string;
  lastEmojis: string[];
  lastUsedEmoji?: string;
  emailVerified?: boolean;

  constructor(obj?: any, uid?: string) {
    this.uid = uid || obj?.uid || '';
    this.name = obj?.name || '';
    this.username = obj?.username || '';
    this.email = obj?.email || '';
    this.password = obj?.password || '';
    this.picture = obj?.picture || 'assets/img/picture_frame.png';
    this.status = obj?.status || '';
    this.lastEmojis = obj?.lastEmojis || ['😍', '😇'];
    this.lastUsedEmoji = obj?.lastUsedEmoji || '';
    this.emailVerified = obj?.emailVerified ?? false;
  }

  public toJSON() {
    return {
      uid: this.uid,
      name: this.name,
      username: this.username,
      email: this.email,
      picture: this.picture,
      status: this.status,
      lastEmojis: this.lastEmojis,
      lastUsedEmoji: this.lastUsedEmoji,
      emailVerified: this.emailVerified,
    };
  }
}
