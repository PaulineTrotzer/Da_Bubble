import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalVariableService {
  statusCheck:boolean=false;
  currentUserData: any = {};
  curentUserId:any;
  openMentionPeopleCard:boolean=false;
  mentionpeopleName:any;
  channelSelected: boolean = false;
  currentChannel: any = null;


  constructor() { }

  setCurrentUserData(userData: any) {
    this.currentUserData = userData;
    this.statusCheck = true;  
  }

  setCurrentChannel(channel: any) {
    this.currentChannel = channel;
    this.channelSelected = true;
  }

  clearCurrentChannel() {
    this.currentChannel = null;
    this.channelSelected = false;
  }
}
