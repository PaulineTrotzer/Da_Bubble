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

@Component({
  selector: 'app-dialog-edit-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-edit-user.component.html',
  styleUrl: './dialog-edit-user.component.scss',
})
export class DialogEditUserComponent implements OnInit {
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
    '../../assets/img/avatar/avatar1.png',
    '../../assets/img/avatar/avatar2.png',
    '../../assets/img/avatar/avatar3.png',
    '../../assets/img/avatar/avatar4.png',
    '../../assets/img/avatar/avatar5.png',
    '../../assets/img/avatar/avatar6.png',
  ];
  storage = inject(Storage);

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
  }

  userData: any = {};

  async getUserById(userId: string) {
    const userDocref = doc(this.firestore, 'users', userId);
    onSnapshot(userDocref, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const id = docSnapshot.id;
        if (data['blockInputField'] === true) {
          this.global.googleAccountLogIn = true;
          this.userData = { id: id, ...data };
        }
      } else {
        this.userData = {};
        this.global.googleAccountLogIn = false;
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.chossePicture = '';
      this.user.picture = '';
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
      input.value = '';
    }
  }

  async saveUser() {
    const editingAvatar = await this.editAvatar(); 
    try {
      const userRef = doc(this.firestore, 'users', this.userID);
      await updateDoc(userRef, {
        name: this.currentUser.name,
        email: this.currentUser.email,
      });
      this.closeEditModus();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Benutzers:', error);
    }
  }

  async editAvatar() {
    if (this.selectedFile) {
      const filePath = `avatars/${this.userID}/${this.selectedFile.name}`;
      const storageRef = ref(this.storage, filePath);
      await uploadBytes(storageRef, this.selectedFile);
      const downloadURL = await getDownloadURL(storageRef);
      await this.updateUserAvatar(downloadURL);
    } else if (this.chossePicture) {
      await this.updateUserAvatar(this.chossePicture);
    }
  }

  async updateUserAvatar(avatarUrl: string) {
    const docRef = doc(this.firestore, 'users', this.userID);
    const updateAvatar = { picture: avatarUrl };
    updateDoc(docRef, updateAvatar);
  }

  showEditableInput(): boolean {
    return !this.guestAccount && !this.global.googleAccountLogIn;
  }
}
