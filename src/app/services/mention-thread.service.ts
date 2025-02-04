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
    const normalizedUserNames = this.allUsersName.map((user: any) =>
      user.name.trim().toLowerCase()
    );
    const mentionName = textPart.startsWith('@')
      ? textPart.substring(1).toLowerCase()
      : '';
    return normalizedUserNames.includes(mentionName);
  } 
  
  splitMessage(text: string | undefined): string[] {
    if (!text) {
      return [];
    }
    const regex = /(@[\w\-_!$*]+)/g;
    const parts = text.split(regex);
    const cleanedParts = parts
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    return cleanedParts;
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
