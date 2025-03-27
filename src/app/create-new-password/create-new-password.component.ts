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
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { checkActionCode } from '@angular/fire/auth';

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

      // Fall 1: Wenn der Mode "recoverEmail" ist, leite zur ResetPassword-Komponente weiter
      if (this.mode === 'recoverEmail' && this.oobCode) {
        this.global.createNewPassword = true;
        this.global.verifyEmail = false;
        return; // Keine weitere Verarbeitung
      }

      // Fall 2: Wenn der Mode "resetPassword" ist, setze global.createNewPassword auf true
      if (this.mode === 'resetPassword' && this.oobCode) {
        const auth = getAuth();
        try {
          const info = await checkActionCode(auth, this.oobCode);
          const emailFromCode = info.data.email;
          if (!emailFromCode) {
            throw new Error('Keine Email im Action Code gefunden');
          }
          const email = emailFromCode.trim().toLowerCase();
          this.emailRaw = email;
          alert('E-Mail aus checkActionCode: ' + email);
          // Setze den Flag, sodass der create-new-password Bereich im Template angezeigt wird
          this.global.createNewPassword = true;
          this.cd.detectChanges();
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error(
              'Fehler beim Abrufen des Action Codes:',
              error.message
            );
          } else {
            console.error('Unbekannter Fehler:', error);
          }
        }
        return; // Stoppe die weitere Verarbeitung
      }

      // Fall 3: Für die Modi "verifyEmail" und "verifyAndChangeEmail" weiter verarbeiten:
      if (
        (this.mode === 'verifyEmail' || this.mode === 'verifyAndChangeEmail') &&
        this.oobCode
      ) {
        const auth = getAuth();
        try {
          const info = await checkActionCode(auth, this.oobCode);
          const emailFromCode = info.data.email;
          if (!emailFromCode) {
            throw new Error('Keine Email im Action Code gefunden');
          }
          const email = emailFromCode.trim().toLowerCase();
          // Speichere den Wert, damit du ihn im Template nutzen kannst
          this.emailRaw = email;
          alert('E-Mail aus checkActionCode: ' + email);

          let q;
          if (this.mode === 'verifyAndChangeEmail') {
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
            console.error(
              'Kein User-Dokument gefunden für die E-Mail: ' + email
            );
          }
          this.cd.detectChanges();
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error(
              'Fehler beim Abrufen des Action Codes:',
              error.message
            );
          } else {
            console.error('Unbekannter Fehler:', error);
          }
        }
      }
    });
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
    /* if (this.mode === 'recoverEmail' && this.oobCode) {
      await confirmPasswordReset(this.currentUser.emailTemp, this.oobCode, this.password);

      this.resetFields();
      this.sendInfo = true;
      this.openDiv();
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1500);
    }
    if (this.password !== this.confirmPassword) {
      this.checkPasswordinfo = true;
      return;
    }
    const auth = getAuth();
    if (!this.oobCode) {
      return;
    }
    await confirmPasswordReset(auth, this.oobCode, this.password);
    const user = auth.currentUser;
    if (user) {
      const userUID = user.uid;
    }
    this.resetFields();
    this.sendInfo = true;
    this.openDiv(); */
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 1500);
  }

  async verifyEmail() {
    const auth = getAuth();
    if (!this.oobCode) return;

    try {
      // Wende den Action Code an, um die E-Mail zu verifizieren
      await applyActionCode(auth, this.oobCode);
      this.global.verifyEmail = true;

      if (this.mode === 'verifyAndChangeEmail') {
        console.log('E-Mail erfolgreich verifiziert und geändert.');
        const userRef = doc(this.firestore, 'users', this.userDocument.id);
        await updateDoc(userRef, {
          email: this.emailRaw,
          emailVerified: true,
          emailTemp: this.userDocument.email,
        });
        console.log(this.userDocument.id.email);
        this.sendInfo = true;
        this.openDiv();
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1500);
      } else if (this.mode === 'verifyEmail') {
        if (this.userDocument && this.userDocument.id) {
          const userRef = doc(this.firestore, 'users', this.userDocument.id);
          await updateDoc(userRef, { emailVerified: true });
          this.sendInfo = true;
          this.openDiv();
          setTimeout(() => {
            this.router.navigate(['/avatar', this.userDocument.id]);
          }, 1500);
        }
      }
    } catch (error: unknown) {
      console.error('Fehler bei der E-Mail‑Bestätigung:', error);
    }
  }
}
