import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScreenDeviceService {
  private workspaceStateSubject = new BehaviorSubject<boolean>(false); 
  workspaceState$ = this.workspaceStateSubject.asObservable();

  private channelStateSubject = new BehaviorSubject<boolean>(false);
  channelState$ = this.channelStateSubject.asObservable();

  constructor() {}

  openWorkspace() {
    this.workspaceStateSubject.next(true);
  }

  setWorkspaceState(isOpen: boolean): void {
    this.workspaceStateSubject.next(isOpen);
  }

  closeWorkspace() {
    this.workspaceStateSubject.next(false);
  }

  openChannel() {
    this.channelStateSubject.next(true);
  }

  closeChannel() {
    this.channelStateSubject.next(false);
  }
}
