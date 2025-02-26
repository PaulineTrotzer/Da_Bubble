import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { collection } from '@firebase/firestore';
import { Firestore, onSnapshot, query, where } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class ThreadControlService {
  firestore = inject(Firestore);

  firstThreadMessageIdSubject = new BehaviorSubject<string | null>(null);
  firstThreadMessageId$ = this.firstThreadMessageIdSubject.asObservable();

  private editedMessageSubject = new BehaviorSubject<any>(null);
  editedMessage$ = this.editedMessageSubject.asObservable();

  replyCountSubject = new BehaviorSubject<number>(0);
  replyCount$ = this.replyCountSubject.asObservable();

  currentThreadMessageIdSubject = new BehaviorSubject<string | null>(null);
  currentThreadMessageId$ = this.currentThreadMessageIdSubject.asObservable();

  private threadMessageSubject = new BehaviorSubject<any>(null);
  public threadMessage$ = this.threadMessageSubject.asObservable();

  private parentToThreadMapping = new Map<string, string>();

  constructor() {}

  setParentToThreadMessageMapping(mapping: {
    parentMessageId: string;
    threadMessageId: string;
  }) {
    this.parentToThreadMapping.set(
      mapping.parentMessageId,
      mapping.threadMessageId
    );
  }

  getThreadMessageIdByParentMessageId(
    parentMessageId: string
  ): string | undefined {
    return this.parentToThreadMapping.get(parentMessageId);
  }

  updateThreadMessage(updatedMessage: any) {
    this.threadMessageSubject.next(updatedMessage);
  }

  setEditedMessage(message: any): void {
    this.editedMessageSubject.next(message);
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

  getReplyCount(messageId: string): Observable<number> {
    return new Observable<number>((observer) => {
      const unsubscribe = onSnapshot(
        collection(this.firestore, `messages/${messageId}/threadMessages`),
        (snapshot) => {
          const replyCount = snapshot.size;
          observer.next(replyCount);
        }
      );
      return () => {
        unsubscribe();
      };
    });
  }

  getReplyCountChannel(channelId: string, messageId: string): Observable<number> {
    return new Observable<number>((observer) => {
      const repliesRef = collection(
        this.firestore,
        'channels',
        channelId,
        'messages',
        messageId,
        'thread'  
      );
      const unsubscribe = onSnapshot(repliesRef, (snapshot) => {
        observer.next(snapshot.size);
      });
      return () => unsubscribe();
    });
  }
}
