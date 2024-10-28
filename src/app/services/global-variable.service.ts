import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalVariableService {
  statusCheck:boolean=false;
  currentUserData: any = {};
  curentUserId:any;
  channelSelected: boolean = false;
  currentChannel: any = null;


  constructor() { }

  setCurrentChannel(channel: any) {
    this.currentChannel = channel;
    this.channelSelected = true;
  }

  clearCurrentChannel() {
    this.currentChannel = null;
    this.channelSelected = false;
  }
}
