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
          });
        });
        this.allUsersName = tempArray;
        resolve();
      });
    });
  }

  isMention(textPart: string): boolean {
    const normalizedUserNames = this.allUsersName.map((user) => {
      return user.name
        .toLowerCase()
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ') 
        .replace(/\s+/g, ' ')
        .trim();
    });

    let mentionName = '';
    if (textPart.startsWith('@')) {
      mentionName = textPart
        .substring(1)
        .toLowerCase()
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return normalizedUserNames.includes(mentionName);
  }

  
  splitMessage(text: string): string[] {
    const mentionRegex = /(@[\w\-_!$*]+(?:\s+[\w\-_!$*]+)?)/g;
    const parts = text.split(mentionRegex);
    return parts
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  async ensureUserDataLoaded(name: string): Promise<any> {
    while (this.allUsersName.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const foundUser = this.allUsersName.find(
      (user) => user.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (!foundUser) {
      console.warn('Benutzer nicht gefunden:', name);
      return null;
    }
    return foundUser;
  }
}
