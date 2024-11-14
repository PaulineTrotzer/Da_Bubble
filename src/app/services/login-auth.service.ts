import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginAuthService {

  private loginSuccessfulSubject = new BehaviorSubject<boolean>(false);
  loginSuccessful$ = this.loginSuccessfulSubject.asObservable();

  private isGuestLoginSubject = new BehaviorSubject<boolean>(false);
  isGuestLogin$ = this.isGuestLoginSubject.asObservable();

  setLoginSuccessful(status: boolean) {
    this.loginSuccessfulSubject.next(status);
  }

  setIsGuestLogin(status: boolean) {
    this.isGuestLoginSubject.next(status);
  }
}
