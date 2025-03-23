import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserChannelSelectService {
  private selectedUserSubject = new BehaviorSubject<any>(null);
  private selectedChannelSubject = new BehaviorSubject<any>(null);

  selectedUser$ = this.selectedUserSubject.asObservable();
  selectedChannel$ = this.selectedChannelSubject.asObservable();

  constructor() {}

  setSelectedUser(user: any) {
    this.selectedUserSubject.next(user);
  }

  setSelectedChannel(channel: any) {
    this.selectedChannelSubject.next(channel);
  }
}
