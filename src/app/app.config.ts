import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() =>
      initializeApp({
        apiKey: "AIzaSyArw6Mvdz0ued26Uz_U3UmBUgMlmPHdbzg",
        authDomain: "dabubble-e3011.firebaseapp.com",
        projectId: "dabubble-e3011",
        storageBucket: "dabubble-e3011.firebasestorage.app",
        messagingSenderId: "958033867140",
        appId: "1:958033867140:web:3e7308834f43c8f01f2dd1",
        measurementId: "G-6S7T8KE35L"
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideDatabase(() => getDatabase()),
    provideStorage(() => getStorage()), provideAnimationsAsync(),
    provideAnimationsAsync(),
  ],
};
