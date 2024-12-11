import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { collection, getDocs, query, where } from '@firebase/firestore';
import { Firestore, onSnapshot } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class ThreadControlService {
  private firstThreadMessageIdSubject = new BehaviorSubject<string | null>(
    null
  );
  firstThreadMessageId$ = this.firstThreadMessageIdSubject.asObservable();

  private replyCountSubject = new BehaviorSubject<number>(0);
  replyCount$ = this.replyCountSubject.asObservable();
  firestore = inject(Firestore);

  private currentThreadMessageIdSubject = new BehaviorSubject<string | null>(
    null
  );
  currentThreadMessageId$ = this.currentThreadMessageIdSubject.asObservable();

  private recipientSubject = new BehaviorSubject<number>(0);
  recipientId$ = this.recipientSubject.asObservable();

  private senderSubject = new BehaviorSubject<number>(0);
  senderId$ = this.senderSubject.asObservable();

  constructor() {}

  getRecipient(message: any): Observable<number> {
    return new Observable<number>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, `messages/${message.id}/threadMessages`),
        (snapshot) => {
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data['recipientId']) {
              console.log(
                `Recipient ID for message ID ${message.id}:`,
                data['recipientId']
              );
              observer.next(data['recipientId']);
            }
          });
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => {
        unsubscribe();
      };
    });
  }


  getSender(message: any): Observable<number> {
    return new Observable<number>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, `messages/${message.id}/threadMessages`),
        (snapshot) => {
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data['senderId']) {
              console.log(
                `senderId ID for message ID ${message.id}:`,
                data['sende']
              );
              observer.next(data['senderId']);
            }
          });
        },
        (error) => {
          observer.error(error);
        }
      );

      return () => {
        unsubscribe();
      };
    });
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
