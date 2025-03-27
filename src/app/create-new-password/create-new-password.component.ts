import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  getAuth,
  confirmPasswordReset,
  applyActionCode,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { checkActionCode, signOut, updatePassword } from '@angular/fire/auth';

@Component({
  selector: 'app-create-new-password',
  standalone: true,
  imports: [FormsModule, MatCardModule, RouterModule, CommonModule],
  templateUrl: './create-new-password.component.html',
  styleUrl: './create-new-password.component.scss',
})
export class CreateNewPasswordComponent {
  sendInfo: boolean = false;
  disabled: boolean = true;
  route = inject(ActivatedRoute);
  checkPasswordinfo: boolean = false;
  password: string = '';
  confirmPassword: string = '';
  oobCode: any;
  mode: any;
  firestore = inject(Firestore);
  router = inject(Router);
  userDocument: any = {};
  passwordTooShort: boolean = false;
  emailRaw?: string;
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  recoverEmailSuccess = false;

  constructor(public global: GlobalVariableService) {}

  openDiv() {
    setTimeout(() => {
      this.sendInfo = false;
    }, 2000);
  }

  resetFields(): void {
    this.confirmPassword = '';
    this.password = '';
  }

  ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      this.oobCode = params['oobCode'];
      this.mode = params['mode'];
      if (!this.oobCode || !this.mode) return;
      if (this.mode === 'recoverEmail') {
        await this.handleRecoverEmail(this.oobCode);
        return;
      }
      if (this.mode === 'resetPassword') {
        await this.handleResetPassword(this.oobCode);
        return;
      }
      if (this.mode === 'verifyEmail' || this.mode === 'verifyAndChangeEmail') {
        await this.handleVerifyEmail(this.oobCode, this.mode);
        return;
      }
    });
  }

  private async handleRecoverEmail(oobCode: string): Promise<void> {
    this.recoverEmailSuccess = true;
    this.global.verifyEmail = false;
    this.global.createNewPassword = false;
    const auth = getAuth();
    try {
      const info = await checkActionCode(auth, oobCode);
      const revertedEmail = info.data.email;
      if (!revertedEmail) {
        throw new Error('Keine E-Mail im Action Code gefunden (recoverEmail).');
      }
      await applyActionCode(auth, oobCode);
      const q = query(
        collection(this.firestore, 'users'),
        where('emailTemp', '==', revertedEmail)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDocRef = doc(this.firestore, 'users', snap.docs[0].id);
        const userData = snap.docs[0].data();
        await updateDoc(userDocRef, {
          email: userData['emailTemp'],
          emailTemp: userData['email'],
        });
      } else {
        console.warn(
          'Kein Dokument mit "emailTemp" ==',
          revertedEmail,
          'gefunden'
        );
      }
      await signOut(auth);
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1800);
    } catch (error) {
      console.error('Fehler beim revertieren der E-Mail:', error);
    }
  }

  async handleResetPassword(oobCode: string): Promise<void> {
    const auth = getAuth();
    try {
      const info = await checkActionCode(auth, oobCode);
      const emailFromCode = info.data.email;
      if (!emailFromCode) {
        throw new Error('Keine Email im Action Code gefunden (resetPassword).');
      }
      const email = emailFromCode.trim().toLowerCase();
      this.emailRaw = email;
      this.global.createNewPassword = true;
      this.cd.detectChanges();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(
          'Fehler beim Abrufen des Action Codes (resetPassword):',
          error.message
        );
      } else {
        console.error('Unbekannter Fehler:', error);
      }
    }
  }

  async handleVerifyEmail(oobCode: string, mode: string): Promise<void> {
    const auth = getAuth();
    try {
      const info = await checkActionCode(auth, oobCode);
      const emailFromCode = info.data.email;
      if (!emailFromCode) {
        throw new Error('Keine Email im Action Code gefunden (verifyEmail).');
      }
      const email = emailFromCode.trim().toLowerCase();
      this.emailRaw = email;
      let q;
      if (mode === 'verifyAndChangeEmail') {
        q = query(
          collection(this.firestore, 'users'),
          where('emailTemp', '==', email)
        );
      } else {
        q = query(
          collection(this.firestore, 'users'),
          where('email', '==', email)
        );
      }
      const snap = await getDocs(q);
      if (!snap.empty) {
        this.userDocument = { id: snap.docs[0].id, ...snap.docs[0].data() };
        this.global.verifyEmail = true;
      } else {
        console.error('Kein User-Dokument gefunden für die E-Mail:', email);
      }
      this.cd.detectChanges();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Fehler beim Abrufen des Action Codes:', error.message);
      } else {
        console.error('Unbekannter Fehler:', error);
      }
    }
  }

  async fetchUserDocument() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.getUserDoc(user.uid);
      }
    });
  }

  async getUserDoc(uid: string) {
    const userDocRef = doc(this.firestore, 'users', uid);
    const getDocRef = await getDoc(userDocRef);
    if (getDocRef.exists()) {
      this.userDocument = { id: getDocRef.id, ...getDocRef.data() };
    }
  }

  checkPasswordFields() {
    this.passwordTooShort =
      this.password.length > 0 && this.password.length < 7;
    if (this.password && this.confirmPassword) {
      this.disabled = false;
      this.checkPasswordinfo = false;
    } else {
      this.disabled = true;
    }
  }

  async createNewPassword() {
    if (this.password !== this.confirmPassword) {
      this.checkPasswordinfo = true;
      return;
    }
    if (this.password.length < 7) {
      this.passwordTooShort = true;
      return;
    }
    const auth = getAuth();
    if (this.mode === 'resetPassword' && this.oobCode) {
      try {
        await confirmPasswordReset(auth, this.oobCode, this.password);
      } catch (error) {
        console.error('Fehler bei confirmPasswordReset:', error);
      }
    }
    this.resetFields();
    this.sendInfo = true;
    this.openDiv();
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1500);
  }

  async verifyEmail() {
    const auth = getAuth();
    if (!this.oobCode) return;
    try {
      await applyActionCode(auth, this.oobCode);
      this.global.verifyEmail = true;
      if (this.mode === 'verifyAndChangeEmail') {
        await this.handleVerifyAndChangeEmail();
      } else if (this.mode === 'verifyEmail') {
        await this.handleSimpleVerifyEmail();
      }
    } catch (error: unknown) {
      console.error('Fehler bei der E-Mail‑Bestätigung:', error);
    }
  }

  async handleVerifyAndChangeEmail() {
    if (!this.userDocument || !this.userDocument.id) {
      console.warn('Kein userDocument gefunden – kann E-Mail nicht ändern.');
      return;
    }
    const userRef = doc(this.firestore, 'users', this.userDocument.id);
    await updateDoc(userRef, {
      email: this.emailRaw,
      emailVerified: true,
      emailTemp: this.userDocument.email,
    });
    this.sendInfo = true;
    this.openDiv();
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1500);
  }

  async handleSimpleVerifyEmail() {
    if (!this.userDocument || !this.userDocument.id) {
      console.warn(
        'Kein userDocument vorhanden – kann Email nicht als verified markieren.'
      );
      return;
    }
    const userRef = doc(this.firestore, 'users', this.userDocument.id);
    await updateDoc(userRef, { emailVerified: true });
    this.sendInfo = true;
    this.openDiv();
    setTimeout(() => {
      this.router.navigate(['/avatar', this.userDocument.id]);
    }, 1500);
  }
}
