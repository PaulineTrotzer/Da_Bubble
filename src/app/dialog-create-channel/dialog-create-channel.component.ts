import { Component, Inject, inject, OnInit } from '@angular/core';
import { Channel } from '../models/channel.class';
import { Firestore } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { DialogAddUserComponent } from '../dialog-add-user/dialog-add-user.component';
import { ActivatedRoute } from '@angular/router';
import { GlobalService } from '../global.service';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-dialog-create-channel',
  standalone: true,
  imports: [FormsModule, CommonModule, MatDialogModule, DialogAddUserComponent],
  templateUrl: './dialog-create-channel.component.html',
  styleUrl: './dialog-create-channel.component.scss',
})
export class DialogCreateChannelComponent implements OnInit {
  constructor(
    private db: Firestore,
    @Inject(MAT_DIALOG_DATA) public data: { userId: string | null }
  ) {}
  isHovered: boolean = false;
  channel: Channel = new Channel();
  readonly dialog = inject(MatDialog);
  route = inject(ActivatedRoute);
  userId: any;
  userData: any;
  selectedChannel: Channel = new Channel();
  global =inject(GlobalVariableService);

  onSubmit(form: any) {
    this.addChannel();
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
    });
    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
      this.selectedChannel = this.channel;
      this.global.setCurrentChannel(this.channel);
    });
  }

  closeDialog() {
    this.dialog.closeAll();
  }

  async addChannel() {
    const channelsRef = collection(this.db, 'channels');
    const docRef = await addDoc(channelsRef, this.channel.toJSON());
    this.channel.id = docRef.id;
    await updateDoc(doc(channelsRef, docRef.id), {
      id: docRef.id,
    });
    this.closeDialog();
    this.openDialog(docRef.id);
  }

  toggleHover() {
    this.isHovered = !this.isHovered;
  }
}
