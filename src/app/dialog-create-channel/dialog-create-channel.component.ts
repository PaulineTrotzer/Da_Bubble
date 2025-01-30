import { Component, Inject, inject, OnInit } from '@angular/core';
import { Channel } from '../models/channel.class';
import { Firestore } from '@angular/fire/firestore';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DialogAddUserComponent } from '../dialog-add-user/dialog-add-user.component';
import { ActivatedRoute } from '@angular/router';
import { GlobalVariableService } from '../services/global-variable.service';
import { WorkspaceService } from '../services/workspace.service';

@Component({
  selector: 'app-dialog-create-channel',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    MatDialogModule,
    DialogAddUserComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './dialog-create-channel.component.html',
  styleUrl: './dialog-create-channel.component.scss',
})
export class DialogCreateChannelComponent implements OnInit {
  constructor(
    private db: Firestore,
    private dialogRef: MatDialogRef<DialogCreateChannelComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userId: string | null }
  ) {}
  isHovered: boolean = false;
  channel: Channel = new Channel();
  readonly dialog = inject(MatDialog);
  route = inject(ActivatedRoute);
  userId: any;
  userData: any;
  selectedChannel: Channel = new Channel();
  global = inject(GlobalVariableService);
  channelExists: boolean = false;
  workspaceService = inject(WorkspaceService);
  channelForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(20)]),
    description: new FormControl('', [Validators.maxLength(64)]),
  });

  onSubmit() {
    debugger;
    if (this.channelForm.valid) {
      this.addChannel();
    }
  }

  ngOnInit(): void {}

  openDialog(channelId: string) {
    const dialogRef = this.dialog.open(DialogAddUserComponent, {
      data: {
        channelId: channelId,
        userId: this.data.userId,
      },
      height: '310px',
      width: '710px',
      autoFocus: false, // Deaktiviere das automatische Fokussieren
      restoreFocus: false,
    });
    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
      this.openNewChannelDirectly(this.channel);
    });
  }

  openNewChannelDirectly(channel: Channel) {
    this.selectedChannel = channel;
    this.global.setCurrentChannel(channel);
  }

  closeDialog() {
    const result = {
      name: this.channel.name,
      userIds: this.channel.userIds,
      id: this.channel.id,
    };
    this.dialogRef.close(result);
  }
  async addChannel() {
    const channelName = this.channelForm.value.name?.trim();

    if (!channelName) {
      console.error('Fehler: Channel-Name ist leer!');
      this.channelExists = true;
      return;
    }

    const channelsRef = collection(this.db, 'channels');
    const channelQuery = query(channelsRef, where('name', '==', channelName));
    const querySnapshot = await getDocs(channelQuery);

    if (!querySnapshot.empty) {
      this.channelExists = true;
      return;
    }

    // 🔥 Erstelle eine Instanz von Channel statt eines einfachen Objekts
    const newChannel = new Channel();
    newChannel.name = channelName;
    newChannel.description = this.channelForm.value.description || '';
    newChannel.userIds = [];
    newChannel.createdBy = this.data.userId || '';

    try {
      // 🚀 Speichere den Channel mit toJSON()
      const docRef = await addDoc(channelsRef, newChannel.toJSON());

      if (!docRef.id) {
        console.error('Fehler: Keine ID für den Channel erhalten!');
        return;
      }

      console.log(
        'Channel erfolgreich erstellt:',
        newChannel,
        'mit ID:',
        docRef.id
      );

      // 🔥 Setze die ID im Channel-Objekt und aktualisiere Firestore
      newChannel.id = docRef.id;
      const channelDocRef = doc(this.db, 'channels', docRef.id);
      await updateDoc(channelDocRef, { id: docRef.id });

      // 🎯 Aktualisiere den Channel in der `workspaceService`
      this.workspaceService.updateChannel(newChannel);

      // 🎯 Setze `this.channel` korrekt
      this.channel = newChannel;
      this.openDialog(this.channel.id);

      this.channelForm.reset();
      this.closeDialog();
    } catch (error) {
      console.error('Fehler beim Erstellen des Channels:', error);
    }
  }

  toggleHover() {
    this.isHovered = !this.isHovered;
  }
}
