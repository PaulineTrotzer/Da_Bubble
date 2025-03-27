import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  inject,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';
import { User } from '../models/user.class';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../services/user.service';
import { Firestore } from '@angular/fire/firestore';
import { updateDoc, doc, onSnapshot } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { OverlayStatusService } from '../services/overlay-status.service';
import { GlobalVariableService } from '../services/global-variable.service';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import { LoginAuthService } from '../services/login-auth.service';
import { getAuth, verifyBeforeUpdateEmail } from '@angular/fire/auth';

@Component({
  selector: 'app-dialog-edit-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-edit-user.component.html',
  styleUrl: './dialog-edit-user.component.scss',
})
export class DialogEditUserComponent implements OnInit {
  googleAccountLogIn: boolean = false;
  loginAuthService = inject(LoginAuthService);
  user: User = new User();
  editModusOpen = true;
  userID: any;
  userservice = inject(UserService);
  editCardOpen = true;
  firestore = inject(Firestore);
  overlayStatusService = inject(OverlayStatusService);
  @Output() closeEditDialog = new EventEmitter<void>();
  @Input() guestAccount: boolean = false;
  @Input() currentUser: User = new User();
  global = inject(GlobalVariableService);
  chossePicture: string = '';
  previewUrl: string | undefined;
  selectedFile: File | null = null;
  avatarBox: string[] = [
    'assets/img/avatar/avatar1.png',
    'assets/img/avatar/avatar2.png',
    'assets/img/avatar/avatar3.png',
    'assets/img/avatar/avatar4.png',
    'assets/img/avatar/avatar5.png',
    'assets/img/avatar/avatar6.png',
  ];
  storage = inject(Storage);
  userData: any = {};
  loadingSpinner = false;
  fileTooLargeMessage: string | null = null;
  userPasswordEingabe: any;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(async (paramMap) => {
      this.userID = paramMap.get('id');
      if (this.userID) {
        const userResult = await this.userservice.getUser(this.userID);
        this.getUserById(this.userID);
        if (userResult) {
          this.user = userResult;
        }
      }
    });
    this.loginAuthService.googleAccountLogIn$.subscribe((status) => {
      this.googleAccountLogIn = status;
    });
  }

  async getUserById(userId: string) {
    const userDocref = doc(this.firestore, 'users', userId);
    onSnapshot(userDocref, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const id = docSnapshot.id;
        if (data['blockInputField'] === true) {
          this.googleAccountLogIn = true;
          this.userData = { id: id, ...data };
        }
      } else {
        this.userData = {};
        this.googleAccountLogIn = false;
      }
    });
  }

  closeEditModus() {
    this.editCardOpen = false;
    this.overlayStatusService.setOverlayStatus(false);
    this.closeEditDialog.emit();
  }

  selectAvatar(picture: string) {
    this.chossePicture = picture;
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      const MAX_FILE_SIZE = 500 * 1024;
      if (selectedFile.size > MAX_FILE_SIZE) {
        console.error(`Datei ist zu groß: ${selectedFile.size / 1024} KB`);
        this.fileTooLargeMessage =
          'Die Datei darf nicht größer als 500 KB sein.';
        return;
      }
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(selectedFile.type)) {
        console.error('Ungültiger Dateityp:', selectedFile.type);
        this.fileTooLargeMessage = 'Nur PNG- oder JPEG-Bilder sind erlaubt.';
        return;
      }
      this.fileTooLargeMessage = null;
      this.selectedFile = selectedFile;
      this.chossePicture = '';
      this.user.picture = '';
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(selectedFile);

      input.value = '';
    }
  }
  async saveUser() {
    this.loadingSpinner = true;
    try {
      const userRef = doc(this.firestore, 'users', this.userID);
      const oldEmail = this.user.email;
      const newEmail = this.currentUser.email;
      const editingAvatar = this.editAvatar();
      const updatingUser = updateDoc(userRef, {
        name: this.currentUser.name,
        emailTemp: newEmail,
      });
      await Promise.all([editingAvatar, updatingUser]);
      if (oldEmail !== newEmail) {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.error(
            'Kein User eingeloggt – Email kann nicht geändert werden.'
          );
          return;
        }
        await verifyBeforeUpdateEmail(currentUser, newEmail);
      }
      this.closeEditModus();
    } catch (error) {
      console.error('Fehler beim Speichern des Benutzers:', error);
    } finally {
      this.loadingSpinner = false;
    }
  }

  async editAvatar() {
    try {
      let avatarWasChanged = false;
      if (this.selectedFile) {
        avatarWasChanged = true;
        const filePath = `avatars/${this.userID}/${this.selectedFile.name}`;
        const storageRef = ref(this.storage, filePath);
        this.loadingSpinner = true;
        await uploadBytes(storageRef, this.selectedFile);
        const downloadURL = await getDownloadURL(storageRef);
        await this.updateUserAvatar(downloadURL);
      } else if (this.chossePicture) {
        localStorage.setItem('SKIP_AUTH_CHECK','true');
        avatarWasChanged = true;
        await this.updateUserAvatar(this.chossePicture);
      }
      if (avatarWasChanged) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Fehler bei editAvatar:', error);
    } finally {
      this.loadingSpinner = false;
    }
  }

  async uploadAvatar(): Promise<string> {
    if (!this.selectedFile) {
      throw new Error('Kein Datei ausgewählt');
    }
    const filePath = `avatars/${this.userID}/${this.selectedFile.name}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, this.selectedFile);
    return await getDownloadURL(storageRef);
  }

  async updateUserAvatar(avatarUrl: string) {
    const docRef = doc(this.firestore, 'users', this.userID);
    const updateAvatar = { picture: avatarUrl };
    updateDoc(docRef, updateAvatar);
  }

  showEditableInput(): boolean {
    return !this.guestAccount && !this.googleAccountLogIn;
  }
}
