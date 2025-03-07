import { Injectable, inject } from '@angular/core';
import {
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInAnonymously,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
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
import { GlobalVariableService } from './global-variable.service';
import { BehaviorSubject } from 'rxjs';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    // Falls du beim Fenster-Schließen offline setzen willst:
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
        `Dokument für Benutzer ${userId} existiert nicht. Übersprungen.`
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

        this.globalVariable.setCurrentUserData(this.user);
        this.loginAuthService.setGoogleAccountLogIn(true);
        this.LogInAuth.setLoginSuccessful(true);

        // Nach dem Login zur Welcome-Seite, dann reload:
        this.router.navigate(['/welcome', this.user.uid]).then(() => {
          window.location.reload();
        });

        setTimeout(() => {
          this.LogInAuth.setLoginSuccessful(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Fehler beim Login:', error);
    }
  }

  async saveUserAfterLogin(user: User) {
    const userRef = doc(this.firestore, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      let finalPhotoUrl = user.picture || '';

      if (user.picture) {
        try {
          finalPhotoUrl = await this.uploadGooglePhotoToStorage(
            user.picture,
            user.uid
          );
        } catch (e) {
          console.warn('Konnte Google-Foto nicht hochladen, nutze leer', e);
        }
      }

      const slugUsername = this.generateUsername(user.name || 'Benutzer');
      await setDoc(userRef, {
        name: user.name || 'Benutzer',
        username: slugUsername,
        email: user.email,
        picture: finalPhotoUrl,
        createdAt: new Date(),
        googleAccount: true,
      });
      console.log('Google-User erstellt.', slugUsername);
    } else {
      // Wenn der Benutzer schon existiert, aktualisiere das Bild trotzdem
      // – nur wenn Du das möchtest!
      try {
        const finalPhotoUrl = await this.uploadGooglePhotoToStorage(
          user.picture,
          user.uid
        );
        await updateDoc(userRef, { picture: finalPhotoUrl });
        console.log('Google-Profilbild aktualisiert.');
      } catch (e) {
        console.warn('Konnte Google-Foto nicht aktualisieren', e);
      }
    }
  }

  private async uploadGooglePhotoToStorage(
    googlePhotoURL: string | undefined,
    userUid: string
  ): Promise<string> {
    if (!googlePhotoURL) {
      return '';
    }
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${userUid}/googlePhoto.jpg`);
      const response = await fetch(googlePhotoURL);
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Google-Fotos: ' + response.status);
      }
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('uploadGooglePhotoToStorage:', error);
      throw error;
    }
  }
  

  generateUsername(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    const base = lastName ? `${firstName} ${lastName}` : firstName;
    return this.makeSlug(base);
  }

  makeSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
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
        username: 'Gast',
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
