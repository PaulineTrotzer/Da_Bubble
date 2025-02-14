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
import { signInWithEmailAndPassword } from '@angular/fire/auth';
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
    IntroAnimationComponent
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

  ngOnInit() {}
  showIntro = true;
  headerLogoActive = false;


  onShowHeader() {
    // Wird von (startShowingHeader) getriggert
    this.headerLogoActive = true;
  }

  onIntroDone() {
    // Overlay entfernen
    this.showIntro = false;
  }

  async onSubmit(ngForm: NgForm) {
    if (ngForm.submitted && ngForm.form.valid) {
      const emailExists = await this.proofMail(this.loginData.email);
      if (!emailExists) {
        this.emailLoginFailed = true;
        return;
      }
      await this.logIn();
    }
  }

  async logIn() {
    if (this.loginAuthService.getIsGuestLogin()) {
      console.log('Gast-Login aktiv, Login wird abgebrochen');
      return;
    }
    this.isGuestLogin = false;
    this.loginAuthService.setGoogleAccountLogIn(false);
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        this.loginData.email,
        this.loginData.password
      );
      this.loginAuthService.setLoginSuccessful(true);
      setTimeout(() => {
        this.loginAuthService.setLoginSuccessful(false);
      }, 2500);
      const user = userCredential.user;
      const userID = await this.userDocId(user.uid);
      localStorage.setItem('userLoggedIn', this.loginData.email);
      this.auth.currentUser = auth.currentUser;
      this.router.navigate(['/welcome', userID]);
      if (userID) {
        this.auth.updateStatus(userID, 'online');
      }
    } catch (error) {
      console.error('Login error: ', error);
      this.formFailed = true;
    }
  }

  async proofMail(email: string): Promise<boolean> {
    const docRef = collection(this.firestore, 'users');
    const q = query(docRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
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
      password: ''
    });
    await this.auth.SignGuestIn();
  }
  
  async googleLogIn() {
    await this.auth.googleLogIn();
  }
}
