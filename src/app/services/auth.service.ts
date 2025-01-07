import { Injectable, inject } from '@angular/core';
import { getAuth, signInWithPopup, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { User } from '../models/user.class';
import {
  Firestore,
  setDoc,
  doc,
  getDoc,
  collection,
  where,
  query,
  getDocs,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { OverlayStatusService } from './overlay-status.service';
import { GlobalService } from '../global.service';
import { LoginAuthService } from './login-auth.service';
import { onAuthStateChanged } from '@angular/fire/auth';
import { GlobalVariableService } from './global-variable.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  router = inject(Router);
  user: User = new User();
  firestore = inject(Firestore);
  currentUser: any;
  guestUser: User = new User();
  overlayStatusService = inject(OverlayStatusService);
  LogInAuth = inject(LoginAuthService);
  global = inject(GlobalService);
  loggedOut = false;
  globalVariable = inject(GlobalVariableService);
  loginAuthService = inject(LoginAuthService);
  workspaceInitializedSubject = new BehaviorSubject<boolean>(false);

  constructor() {
    window.addEventListener('beforeunload', async (event) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        await this.updateStatus(currentUser.uid, 'offline');
      }
    });
  }


  initAuthListener() {
    const auth = getAuth();

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        this.globalVariable.setCurrentUserData(user);
        if (user.isAnonymous) {
          this.loginAuthService.setIsGuestLogin(true);
        } else {
          this.loginAuthService.setIsGuestLogin(false);
        }

        await this.updateStatus(user.uid, 'online');
      } else {
        this.currentUser = null;
        this.globalVariable.setCurrentUserData(null);

        this.loginAuthService.setGoogleAccountLogIn(false);
        this.loginAuthService.setIsGuestLogin(false);
      }
    });
  }

  async deleteGuest(userId: any) {
    await deleteDoc(doc(this.firestore, 'users', userId));
  }

  async updateStatus(userId: string, status: 'online' | 'offline') {
    if (!userId) return;
    const docRef = doc(this.firestore, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      try {
        await updateDoc(docRef, { status: status });
      } catch (err) {
        console.error('Fehler beim Aktualisieren des Benutzerstatus: ', err);
      }
    } else {
      console.warn(
        `Dokument für Benutzer ${userId} existiert nicht. Wird übersprungen.`
      );
    }
  }
  async googleLogIn() {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    try {
      const result = await signInWithPopup(auth, provider);
      const currentUser = auth.currentUser;

      if (currentUser) {
        const googleProviderData = result.user.providerData.find(
          (data) => data.providerId === 'google.com'
        );
        const email = googleProviderData?.email;
        this.user = new User({
          picture: result.user.photoURL,
          uid: result.user.uid,
          name: result.user.displayName,
          email: email,
        });
        await this.saveUserAfterLogin(this.user);
        this.loginAuthService.setGoogleAccountLogIn(true);
        this.LogInAuth.setLoginSuccessful(true);
        this.router.navigate(['/welcome', this.user.uid]);
        setTimeout(() => {
          this.LogInAuth.setLoginSuccessful(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Fehler beim Login:', error);
    }
  }

  async saveUserAfterLogin(user: any) {
    const userRef = doc(this.firestore, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) {
      await setDoc(userRef, {
        name: user.name || 'Benutzer',
        email: user.email,
        picture: user.picture || '',
        createdAt: new Date(),
        googleAccount: true,
      });
      console.log('User erstellt.');
    } else {
      const existingUserData = userSnapshot.data();
      if (!existingUserData?.['googleAccount']) {
        console.log(
          'User bereits vorhanden, keine Überschreibung des Google Accounts.'
        );
      } else {
        console.log('User ist bereits ein Google-Account Nutzer.');
      }
    }
  }

  async logOut() {
    this.loginAuthService.setGoogleAccountLogIn(false);
    const auth = getAuth();
    const currentUser = auth.currentUser;
    try {
      if (currentUser) {
        await this.updateStatus(currentUser.uid, 'offline');
        if (currentUser.isAnonymous) {
          await deleteDoc(doc(this.firestore, 'users', currentUser.uid));
        }
        if (currentUser?.isAnonymous) {
          this.deleteGuest(currentUser.uid);
        }
        this.currentUser = null;
        this.globalVariable.setCurrentUserData(null);
        this.loginAuthService.setIsGuestLogin(false);
        await signOut(auth);
      }
      this.overlayStatusService.setOverlayStatus(false);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async SignGuestIn() {
    const auth = getAuth();
    try {
      const result = await signInAnonymously(auth);
      const guestUser = new User({
        uid: result.user.uid,
        name: 'Gast',
        email: `guest_${result.user.uid}@anonymous.com`,
        picture: './assets/img/picture_frame.png',
        status: 'online',
      });
      this.guestUser = guestUser;
      const userRef = doc(this.firestore, `users/${guestUser.uid}`);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        await setDoc(userRef, guestUser.toJSON());
      }
      this.globalVariable.setCurrentUserData(this.guestUser);
      this.LogInAuth.setIsGuestLogin(true);
      this.overlayStatusService.setOverlayStatus(true);
      this.LogInAuth.setLoginSuccessful(true);
      setTimeout(() => {
        this.LogInAuth.setLoginSuccessful(false);
        this.overlayStatusService.setOverlayStatus(false);
      }, 1500);
      this.router.navigate(['/welcome', guestUser.uid]);
    } catch (error) {
      console.error('Error during anonymous sign-in:', error);
    }
  }

  async findUserByMail(identifier: string) {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('email', '==', identifier));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    } else {
      return null;
    }
  }
}
