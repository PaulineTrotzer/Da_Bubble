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
  createNewPassword: boolean = false;
  verifyEmail: boolean = true;
  checkoben: boolean = false;
  checkCountStatus: any;
  checkCountStatusUser: any;
  currentRoom: any;
  openChannelorUserBox: boolean = false;
  openChannelOrUserThread: boolean = false;

  checkWideChannelorUserBox: boolean = false;
  checkWideChannelOrUserThreadBox: boolean = false;

  private _threadOpened = new BehaviorSubject<boolean>(false);
  public threadOpened$ = this._threadOpened.asObservable();

  setThreadOpened(value: boolean) {
    this._threadOpened.next(value);
  }

  get threadOpened(): boolean {
    return this._threadOpened.value;
  }

  private welcomeChannelSubject = new BehaviorSubject<boolean>(false);
  welcomeChannel$ = this.welcomeChannelSubject.asObservable();

  public currentThreadMessageSubject = new BehaviorSubject<string | null>('');
  currentThreadMessage$ = this.currentThreadMessageSubject.asObservable();

  public channelThreadSubject = new BehaviorSubject<string | null>(null);
  channelThread$ = this.channelThreadSubject.asObservable();

  private currentUserDataSubject = new BehaviorSubject<any>(null);
  currentUserData$ = this.currentUserDataSubject.asObservable();

  constructor() {}

  async setCurrentUserData(userData: any) {
    this.currentUserDataSubject.next(userData);
    this.statusCheck = true;
  }

  getCurrentUserId() {
    const currentUserData = this.currentUserDataSubject.value;
    return currentUserData ? currentUserData.id : null;
  }

  setCurrentChannel(channel: any) {
    if (!channel) {
      return;
    }
    this.currentChannel = channel;
    this.channelSelected = true;
    if (channel.name === 'Willkommen') {
      this.welcomeChannelSubject.next(true);
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
