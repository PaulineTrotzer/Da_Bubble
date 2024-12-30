import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserChannelSelectService {
  private selectedUserSubject = new BehaviorSubject<any>(null); // für selectedUser
  private selectedChannelSubject = new BehaviorSubject<any>(null); // für selectedChannel

  selectedUser$ = this.selectedUserSubject.asObservable(); // Observable für selectedUser
  selectedChannel$ = this.selectedChannelSubject.asObservable(); // Observable für selectedChannel

  constructor() { }

  // Methode zum Setzen des ausgewählten Users
  setSelectedUser(user: any) {
    this.selectedUserSubject.next(user); // gibt den neuen Wert an alle Abonnenten weiter
  }

  // Methode zum Setzen des ausgewählten Channels
  setSelectedChannel(channel: any) {
    this.selectedChannelSubject.next(channel); // gibt den neuen Wert an alle Abonnenten weiter
  }
}