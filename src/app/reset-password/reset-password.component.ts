import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PrivacyPolicyComponent } from '../privacy-policy/privacy-policy.component';
import { ImpressumComponent } from '../impressum/impressum.component';
import {
  Firestore,
  getDocs,
  collection,
  query,
  where,
} from '@angular/fire/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    MatCardModule,
    CommonModule,
    FormsModule,
    RouterModule,
    PrivacyPolicyComponent,
    ImpressumComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  sendInfo: boolean = false;
  disabled: boolean = true;
  userEmail = '';
  firestore = inject(Firestore);
  falseEmailInfo: boolean = false;
  emailValid: boolean = true;
  router = inject(Router);

  openDiv() {
    this.sendInfo = true;
    setTimeout(() => {
      this.sendInfo = false;
    }, 2000);
  }

  ngOnInit(): void {}

  onInputChange(value: string): void {
    this.userEmail = value;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    this.emailValid = emailRegex.test(this.userEmail);
    this.disabled = !this.emailValid;
  }

  async sendEmail() {
    const docref = collection(this.firestore, 'users');
    const q = query(docref, where('email', '==', this.userEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      await this.sendEmailInfo(this.userEmail);
      this.sendInfo = true;
      this.userEmail = '';
      this.openDiv();
    } else {
      this.falseEmailInfo = true;
    }
  }

  async sendEmailInfo(email: string) {
    const auth = getAuth();
    const actionCodeSettings = {
      url: 'http://localhost:64836/create-new-password',
      handleCodeInApp: true,
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  }
}
