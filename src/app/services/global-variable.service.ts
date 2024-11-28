import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GlobalVariableService {
  statusCheck: boolean = false;
  currentUserData: any = {};
  curentUserId: any;
  openMentionPeopleCard: boolean = false;
  mentionpeopleName: any;
  channelSelected: boolean = false;
  currentChannel: any = null;
  welcomeChannel: boolean = false;
  openMentionMessageBox: boolean = false;
  getUserByName: any = {};
  googleAccountLogIn: boolean = false;
  createNewPassword: boolean = false;
  verifyEmail: boolean = true;

  private welcomeChannelSubject = new BehaviorSubject<boolean>(false);
  welcomeChannel$ = this.welcomeChannelSubject.asObservable();

  private currentThreadMessageSubject = new BehaviorSubject<string>('');
  currentThreadMessage$ = this.currentThreadMessageSubject.asObservable();

  constructor() {}

  async setCurrentUserData(userData: any) {
    this.currentUserData = userData;
    this.statusCheck = true;
  }

  setCurrentChannel(channel: any) {
    this.currentChannel = channel;
    this.channelSelected = true;
    if (channel.name == 'Willkommen') {
      this.welcomeChannelSubject.next(true);
      this.channelSelected = false;
    } else {
      this.welcomeChannelSubject.next(false);
    }
  }

  getWelcomeChannel() {
    return this.welcomeChannelSubject.asObservable();
  }

  clearCurrentChannel() {
    this.currentChannel = null;
    this.channelSelected = false;
  }

  setCurrentThreadMessage(messageId: string) {
    this.currentThreadMessageSubject.next(messageId);
    console.log('global Message set:', messageId);
  }
}
