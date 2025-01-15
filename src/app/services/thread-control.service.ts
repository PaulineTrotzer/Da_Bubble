import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { collection, getDocs, query, where } from '@firebase/firestore';
import { Firestore, limit, onSnapshot, orderBy } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class ThreadControlService {
  firestore = inject(Firestore);

  firstThreadMessageIdSubject = new BehaviorSubject<string | null>(null);
  firstThreadMessageId$ = this.firstThreadMessageIdSubject.asObservable();

  replyCountSubject = new BehaviorSubject<number>(0);
  replyCount$ = this.replyCountSubject.asObservable();

  currentThreadMessageIdSubject = new BehaviorSubject<string | null>(null);
  currentThreadMessageId$ = this.currentThreadMessageIdSubject.asObservable();

/*   private lastMessageIdSubject = new BehaviorSubject<string | null>(null);
  lastMessageId$ = this.lastMessageIdSubject.asObservable(); */

  private threadMessageSubject = new BehaviorSubject<any>(null);
  public threadMessage$ = this.threadMessageSubject.asObservable();


  constructor() {}

  updateThreadMessage(updatedMessage: any) {
    this.threadMessageSubject.next(updatedMessage);
  }

  get currentFirstThreadMessageId(): string | null {
    return this.firstThreadMessageIdSubject.value;
  }


/*   async initializeLastMessageId(threadId: any): Promise<void> {
    const threadMessagesRef = collection(
      this.firestore,
      `messages/${threadId}/threadMessages`
    );
    const querySnapshot = await getDocs(
      query(threadMessagesRef, orderBy('timestamp', 'desc'), limit(1))
    );

    if (!querySnapshot.empty) {
      const lastMessage = querySnapshot.docs[0];
      this.setLastMessageId(lastMessage.id);
    } else {
      console.log(
        'Kein letzter Nachrichteneintrag gefunden, Standardwert bleibt 0.'
      );
    }
  } */

/*   setLastMessageId(id: string): void {
    console.log('Setze lastMessageId:', id);
    this.lastMessageIdSubject.next(id);
  } */

/*   async updateLastMessageId(threadId: string): Promise<void> {
    const threadMessagesRef = collection(
      this.firestore,
      `messages/${threadId}/threadMessages`
    );
    const latestMessage = await getDocs(
      query(threadMessagesRef, orderBy('timestamp', 'desc'), limit(1))
    );
    if (!latestMessage.empty) {
      const messageId = latestMessage.docs[0].id;
      this.setLastMessageId(messageId);
    } else {
      console.log('Kein letzter Nachrichteneintrag gefunden.');
    }
  } */

 /*  getLastMessageId(): Observable<string | null> {
    return this.lastMessageId$;
  }
 */
  setFirstThreadMessageId(id: string | null) {
    this.firstThreadMessageIdSubject.next(id);
  }

  getFirstThreadMessageId(): string | null {
    return this.firstThreadMessageIdSubject.value;
  }

  setCurrentThreadMessageId(id: string) {
    if (id) {
      this.currentThreadMessageIdSubject.next(id);
      console.log('currentThreadMessageId gesetzt auf:', id);
    } else {
      console.error('Keine gültige Thread-Nachricht-ID übergeben.');
    }
  }

  getCurrentThreadMessageId(): string | null {
    return this.currentThreadMessageIdSubject.value;
  }

  getReplyCount(messageId: string): Observable<number> {
    return new Observable<number>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, `messages/${messageId}/threadMessages`),
        (snapshot) => {
          const replyCount = snapshot.size - 1;
          observer.next(replyCount);
        }
      );
      return () => {
        unsubscribe();
      };
    });
  }
}
