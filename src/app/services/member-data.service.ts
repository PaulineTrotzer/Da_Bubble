import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MemberDataService {
  private membersSubject = new BehaviorSubject<any[]>([]);
  private channelSubject = new BehaviorSubject<any>(null);


  members$: Observable<any[]> = this.membersSubject.asObservable();
  channel$: Observable<any> = this.channelSubject.asObservable();


  constructor() {}

  // Methode, um Mitglieder zu setzen
  setMembers(members: any[]) {
    this.membersSubject.next(members);
  }

  // Methode zum Setzen des Channels
  setChannel(channel: any) {
    this.channelSubject.next(channel);
  }

}
