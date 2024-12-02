import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThreadControlService {
  private firstThreadMessageIdSubject = new BehaviorSubject<string | null>(
    null
  );
  firstThreadMessageId$ = this.firstThreadMessageIdSubject.asObservable();

  directThreadOpened = false;

  constructor() {}

  setFirstThreadMessageId(id: string | null) {
    this.firstThreadMessageIdSubject.next(id);
    console.log('First thread message ID set:', id);
  }

  getFirstThreadMessageId(): string | null {
    return this.firstThreadMessageIdSubject.value;
  }

  setDirectThreadStatus(status: boolean) {
    return (this.directThreadOpened = status);
  }
}
