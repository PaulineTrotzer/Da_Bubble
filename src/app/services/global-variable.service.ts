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
  checkoben:boolean=false
  checkCountStatus:any
  checkCountStatusUser:any
  currentRoom:any
  openChannelorUserBox:boolean=false;
  openChannelOrUserThread:boolean=false;
 
  checkWideChannelorUserBox:boolean=false;
  checkWideChannelOrUserThreadBox:boolean=false;

  private welcomeChannelSubject = new BehaviorSubject<boolean>(false);
  welcomeChannel$ = this.welcomeChannelSubject.asObservable();

  public currentThreadMessageSubject = new BehaviorSubject<string | null>('');
  currentThreadMessage$ = this.currentThreadMessageSubject.asObservable();

  public channelThreadSubject = new BehaviorSubject<string | null>(null);
  channelThread$ = this.channelThreadSubject.asObservable()

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
      this.channelSelected = true;
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

  setChannelThread(messageId: string) {
    if (this.channelThreadSubject.value !== messageId) {
      this.channelThreadSubject.next(messageId);
    } else {
      this.channelThreadSubject.next(null);
      setTimeout(() => this.channelThreadSubject.next(messageId), 0);
    }
  }

}
