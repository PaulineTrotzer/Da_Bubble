import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',  
})
export class WorkspaceService {

   selectedUserSubject = new BehaviorSubject<any>(null);
   selectedChannelSubject = new BehaviorSubject<any>(null);

  constructor() {}

  get selectedUser$() {
    return this.selectedUserSubject.asObservable();
  }


  setSelectedUser(user: any) {
    this.selectedUserSubject.next(user);
  }


  get selectedChannel$() {
    return this.selectedChannelSubject.asObservable();
  }


  setSelectedChannel(channel: any) {
    this.selectedChannelSubject.next(channel);
  }

  updateChannel(channel: any) {
    this.selectedChannelSubject.next(channel);
  }
}
