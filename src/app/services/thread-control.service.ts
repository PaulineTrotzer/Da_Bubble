import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { collection, getDocs, query, where } from '@firebase/firestore';
import { Firestore, onSnapshot } from '@angular/fire/firestore';

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

  private lastMessageIdSubject = new BehaviorSubject<string | null>(null); // Anfangswert ist null
  lastMessageId$ = this.lastMessageIdSubject.asObservable();

  constructor() {}

  async initializeLastMessageId(threadId: string): Promise<void> {
    const threadMessagesRef = collection(this.firestore, `messages/${threadId}/threadMessages`);

    // Hole die Nachrichten und warte, bis die Promise aufgelöst ist
    const querySnapshot = await getDocs(threadMessagesRef);

    // Überprüfe, ob es Nachrichten gibt
    if (!querySnapshot.empty) {
      const lastMessage = querySnapshot.docs[querySnapshot.size - 1]; // Nimm die letzte Nachricht
      this.lastMessageIdSubject.next(lastMessage.id); // Setze die ID der letzten Nachricht
    } else {
      this.lastMessageIdSubject.next(null); // Setze null, wenn keine Nachrichten vorhanden sind
    }
  }


  setLastMessageId(messageData: any): void {
    this.lastMessageIdSubject.next(messageData.id);
  }

  getLastMessageId(): Observable<string | null> {
    return this.lastMessageId$;
  }


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
