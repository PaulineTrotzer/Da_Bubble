import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OverlayStatusService {
  private overlayStatus = new BehaviorSubject<boolean>(false);
  overlayStatus$ = this.overlayStatus.asObservable();

  constructor() {}

  setOverlayStatus(status: boolean): void {
    this.overlayStatus.next(status);
  }

  getOverlayStatus(): boolean {
    return this.overlayStatus.value;
  }
}
