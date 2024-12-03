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


  constructor() {}

  setFirstThreadMessageId(id: string | null) {
    this.firstThreadMessageIdSubject.next(id);
  }

  getFirstThreadMessageId(): string | null {
    return this.firstThreadMessageIdSubject.value;
  }

  setCurrentThreadMessageId(id: string) {
    this.currentThreadMessageIdSubject.next(id);
  }

  getReplyCount(messageId: string): Observable<number> {
    return new Observable<number>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, `messages/${messageId}/threadMessages`),
        (snapshot) => {
          const replyCount = snapshot.size - 1;
          console.log(`Reply count for message ID ${messageId}:`, replyCount);
          observer.next(replyCount);
        }
      );
      return () => {
        unsubscribe();
      };
    });
  }
}
