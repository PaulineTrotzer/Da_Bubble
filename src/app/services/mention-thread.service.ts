import { Injectable, inject } from '@angular/core';
import { Firestore, collection, onSnapshot } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class MentionThreadService {
  firestore = inject(Firestore);
  allUsersName: any[] = [];

  constructor() {}

  async getAllUsersname(): Promise<void> {
    const userRef = collection(this.firestore, 'users');
    return new Promise((resolve) => {
      onSnapshot(userRef, (querySnapshot) => {
        const tempArray: any[] = [];
        querySnapshot.forEach((doc) => {
          const dataUser = doc.data();
          tempArray.push({
            name: dataUser['name'],
            email: dataUser['email'],
            picture: dataUser['picture'] || 'assets/img/default-avatar.png',
            id: doc.id,
            lastUsedEmoji: dataUser['lastUsedEmoji'] || '',
            username: dataUser['username'] || '',
          });
        });
        this.allUsersName = tempArray;
        resolve();
      });
    });
  }

  isMention(textPart: string): boolean {
    if (!textPart.startsWith('@')) {
      return false;
    }
    const mentionName = textPart.substring(1).toLowerCase().trim();
    const normalizedUserNames = this.allUsersName.map((user: any) =>
      (user.username ?? '').toLowerCase().trim()
    );
  
    return normalizedUserNames.includes(mentionName);
  }

  
  splitMessage(text: string): string[] {
    const mentionRegex = /(@[\w\-\*_!$]+)/g;
    const parts = text.split(mentionRegex);

    return parts.map((p) => p.trim()).filter((p) => p.length > 0);
  }


  async ensureUserDataLoaded(name: string): Promise<any> {
    while (this.allUsersName.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const foundUser = this.allUsersName.find(
      (user) => (user.username ?? '').trim().toLowerCase() === name.trim().toLowerCase()
    );
    
    if (!foundUser) {
      console.warn('Benutzer nicht gefunden:', name);
      return null;
    }
    return foundUser;
  }
}
