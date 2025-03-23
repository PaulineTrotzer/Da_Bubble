import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginAuthService {
  private loginSuccessfulSubject = new BehaviorSubject<boolean>(false);
  loginSuccessful$ = this.loginSuccessfulSubject.asObservable();

  private isGuestLoginSubject = new BehaviorSubject<boolean>(false);
  isGuestLogin$ = this.isGuestLoginSubject.asObservable();

  private googleAccountLogInSubject = new BehaviorSubject<boolean>(false);
  googleAccountLogIn$ = this.googleAccountLogInSubject.asObservable();

  setLoginSuccessful(status: boolean) {
    this.loginSuccessfulSubject.next(status);
  }

  setIsGuestLogin(status: boolean) {
    this.isGuestLoginSubject.next(status);
  }

  getIsGuestLogin(): boolean {
    return this.isGuestLoginSubject.value;
  }

  getGoogleAccountLogIn(): boolean {
    return this.googleAccountLogInSubject.getValue();
  }

  setGoogleAccountLogIn(status: boolean) {
    this.googleAccountLogInSubject.next(status);
  }
}
