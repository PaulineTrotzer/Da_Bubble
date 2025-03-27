import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import {
  Firestore,
  getDocs,
  collection,
  query,
  where,
} from '@angular/fire/firestore';
import { UserCredential, signInWithEmailAndPassword } from '@angular/fire/auth';
import { getAuth } from 'firebase/auth';
import { AuthService } from '../services/auth.service';
import { MatCardModule, MatCardContent } from '@angular/material/card';
import { LoginAuthService } from '../services/login-auth.service';
import { OverlayStatusService } from '../services/overlay-status.service';
import { GlobalVariableService } from '../services/global-variable.service';
import { IntroAnimationComponent } from '../intro-animation/intro-animation.component';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    IntroAnimationComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginData = {
    email: '',
    password: '',
  };
  loginFailed = false;
  loading = false;
  userService = inject(UserService);
  firestore = inject(Firestore);
  auth = inject(AuthService);
  router = inject(Router);
  emailLoginFailed = false;
  formFailed = false;
  isGuestLogin = false;
  loginSuccessful = false;
  loginAuthService = inject(LoginAuthService);
  overlayStatusService = inject(OverlayStatusService);
  global = inject(GlobalVariableService);
  googleUserUid: any = '';
  @ViewChild('loginForm', { static: false }) loginForm!: NgForm;
  constructor() {}
  public flyUpActive = false;

  ngOnInit() {
    setTimeout(() => {
      this.flyUpActive = true;
    }, 1000);
  }

  async onSubmit(ngForm: NgForm) {
    if (ngForm.submitted && ngForm.form.valid) {
      await this.logIn();
    }
  }

  async logIn() {
    if (this.loginAuthService.getIsGuestLogin()) return;
    this.isGuestLogin = false;
    this.loginAuthService.setGoogleAccountLogIn(false);
    try {
      const userCredential = await signInWithEmailAndPassword(
        getAuth(),
        this.loginData.email,
        this.loginData.password
      );
      await this.handleLoginSuccess(userCredential);
    } catch (error: any) {
      this.handleLoginError(error);
    }
  }

  private async handleLoginSuccess(userCredential: UserCredential) {
    this.loginAuthService.setLoginSuccessful(true);
    setTimeout(() => {
      this.loginAuthService.setLoginSuccessful(false);
    }, 2500);
    const user = userCredential.user;
    localStorage.setItem('userLoggedIn', this.loginData.email);
    this.auth.currentUser = getAuth().currentUser;
    const userID = await this.userDocId(user.uid);
    if (userID) {
      this.auth.updateStatus(userID, 'online');
    }
    this.router.navigate(['/welcome', userID]);
  }

  private handleLoginError(error: any) {
    console.error('Login error: ', error);

    if (error.code === 'auth/user-not-found') {
      this.emailLoginFailed = true;
    } else if (error.code === 'auth/wrong-password') {
      this.formFailed = true;
    } else if (error.code === 'auth/invalid-email') {
      this.emailLoginFailed = true;
    } else {
      this.formFailed = true;
    }
  }

  async userDocId(uid: string) {
    const docRef = collection(this.firestore, 'users');
    const q = query(docRef, where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return userDoc.id;
    }
    return null;
  }

  onEmailChange() {
    this.emailLoginFailed = false;
  }

  onPasswordChange() {
    this.formFailed = false;
  }

  async guestLogin() {
    this.loginForm.reset();
    this.loginForm.setValue({
      email: '',
      password: '',
    });
    await this.auth.SignGuestIn();
  }

  async googleLogIn() {
    await this.auth.googleLogIn();
  }
}
