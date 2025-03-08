import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScreenDeviceService {
  private workspaceStateSubject = new BehaviorSubject<boolean>(false); // false bedeutet, Workspace ist geschlossen
  workspaceState$ = this.workspaceStateSubject.asObservable();

  private channelStateSubject = new BehaviorSubject<boolean>(false);
  channelState$ = this.channelStateSubject.asObservable();


  constructor() {
/*     this.updateScreenSize();
    window.addEventListener('resize', () => this.updateScreenSize()); */
  }

  openWorkspace() {
    this.workspaceStateSubject.next(true);
  }

  setWorkspaceState(isOpen: boolean): void {
    this.workspaceStateSubject.next(isOpen);
  }

  // Methode, um den Workspace zu schließen
  closeWorkspace() {
    this.workspaceStateSubject.next(false);
  }

  // Methode, um den Channel zu öffnen
  openChannel() {
    this.channelStateSubject.next(true);
  }

  // Methode, um den Channel zu schließen
  closeChannel() {
    this.channelStateSubject.next(false);
  }

  // Optional: Wenn du etwas auf Basis der Bildschirmgröße ändern möchtest
  // updateScreenSize() {
  //   this.bigScreen = window.innerWidth >= 750;
  // }
}