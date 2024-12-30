import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',  // Damit der Service global verfügbar ist
})
export class WorkspaceService {

  // BehaviorSubjects für selectedUser und selectedChannel
   selectedUserSubject = new BehaviorSubject<any>(null);
   selectedChannelSubject = new BehaviorSubject<any>(null);

  constructor() {}

  // Getter für selectedUser
  get selectedUser$() {
    return this.selectedUserSubject.asObservable();
  }

  // Setter für selectedUser
  setSelectedUser(user: any) {
    this.selectedUserSubject.next(user);
  }

  // Getter für selectedChannel
  get selectedChannel$() {
    return this.selectedChannelSubject.asObservable();
  }

  // Setter für selectedChannel
  setSelectedChannel(channel: any) {
    this.selectedChannelSubject.next(channel);
  }
}
