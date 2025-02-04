import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Firestore, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent } from '@angular/material/card';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { Emoji } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { GlobalVariableService } from '../services/global-variable.service';

@Component({
  selector: 'app-thread-parent-message',
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    MatCardContent,
    PickerComponent,
    FormsModule,
  ],
  templateUrl: './thread-parent-message.component.html',
  styleUrl: './thread-parent-message.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out', style({ opacity: 1 })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-50%)' }),
        animate(
          '150ms ease-in-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateX(0)' }),
        animate(
          '150ms ease-in-out',
          style({ opacity: 0, transform: 'translateX(-50%)' })
        ),
      ]),
    ]),
  ],
})
export class ThreadParentMessageComponent {
  @Input() pm: any;
  @Input() currentUser: any;
  @Input() selectedUser: any;
  @Input() messagesData: any[] = [];
  showOptionBar: { [messageId: string]: boolean } = {};
  showEditOption: { [messageId: string]: boolean } = {};
  editWasClicked = false;
  editMessageId: string | null = null;
  editableMessageText = '';
  isOverlay = false;
  global = inject(GlobalVariableService);

  isEmojiPickerVisible = false;
  isEmojiPickerEditVisible = false;
  firestore = inject(Firestore);

  @Output() toggleOptionBarEvent = new EventEmitter<{
    messageId: string;
    show: boolean;
  }>();
  @Output() toggleEditOptionEvent = new EventEmitter<{
    messageId: string;
    show: boolean;
  }>();

  toggleEditOption(messageId: string, show: boolean) {
    this.showEditOption[messageId] = show;
  }

  toggleOptionBar(messageId: string, show: boolean) {
    console.log('toggleOptionBar:', messageId, '=>', show);
    this.showOptionBar[messageId] = show;
  }

  editMessage(pm: any) {
    this.editWasClicked = true;
    this.editMessageId = pm.id;
    this.editableMessageText = pm.text;
  }

  async saveOrDeleteMessage(pm: any) {
    if (!pm?.id) {
      console.error(
        'Invalid message object passed to saveOrDeleteParentMessage'
      );
      return;
    }

    // Pfad: immer "messages/<parentId>"
    const docPath = `messages/${pm.id}`;
    const messageRef = doc(this.firestore, docPath);

    try {
      // Wenn Text leer, -> löschen
      if (!this.editableMessageText.trim()) {
        await deleteDoc(messageRef);
        console.log('Nachricht gelöscht:', pm.id);
      } else {
        // Sonst: updaten
        const updatedFields = {
          text: this.editableMessageText.trim(),
          editedTextShow: true,
          editedAt: new Date().toISOString(),
        };
        await updateDoc(messageRef, updatedFields);
        console.log('Nachricht aktualisiert:', pm.id);
      }
    } catch (error) {
      console.error('Error in saveOrDeleteParentMessage:', error);
    }

    // Edit-Mode verlassen
    this.resetEditMode();
  }

  resetEditMode() {
    this.editMessageId = null;
    this.editableMessageText = '';
    this.editWasClicked = false;
  }

  addEmojiToEdit(event: any) {
    if (event && event.emoji && event.emoji.native) {
      const emoji = event.emoji.native;
      this.editableMessageText = (this.editableMessageText || '') + emoji;
      this.closePickerEdit();
    } else {
      console.error('kein Emoji ausgewählt');
    }
  }

  cancelEdit() {
    this.editWasClicked = false;
    this.editMessageId = null;
    this.editableMessageText = '';
  }

  letPickerVisible(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerVisible = true;
  }

  letPickerEditVisible(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerEditVisible = true;
  }

  openEmojiPicker() {
    this.isEmojiPickerVisible = true;
    this.isOverlay = true;
  }

  openEmojiPickerEditMode() {
    this.isOverlay = true;
    this.isEmojiPickerEditVisible = true;
  }

  closePicker() {
    this.isEmojiPickerVisible = false;
    this.isOverlay = false;
  }

  closePickerEdit() {
    this.isOverlay = false;
    this.isEmojiPickerEditVisible = false;
  }

  messageIdHovered: string | null = null;

  async addEmoji(event: any, message: any) {
    const chosenEmoji = event?.emoji?.native;
    // 1) Emoji aus event holen
    const emoji = event?.emoji?.native;
    if (!emoji) {
      console.error('Kein Emoji im Event gefunden');
      return;
    }
    message.lastUsedEmoji = chosenEmoji;
    if (this.global.currentUserData?.id === message.senderId) {
      // ============= Der aktuelle User ist der Sender =============
      message.senderchoosedStickereBackColor = emoji;
      message.stickerBoxCurrentStyle = true;

      // Toggling der senderSticker
      if (message.senderSticker === emoji) {
        message.senderSticker = '';
        if (message.senderStickerCount === 2) {
          message.senderStickerCount = 1;
        }
      } else {
        message.senderSticker = emoji;
        message.senderStickerCount = 1;
      }

      // Falls Empfänger denselben Sticker hat
      if (message.recipientSticker === emoji) {
        message.recipientStickerCount =
          (message.recipientStickerCount || 1) + 1;
        message.senderSticker = '';
        if (message.recipientStickerCount === 2) {
          message.senderSticker = message.recipientSticker;
        }
        if (message.recipientStickerCount >= 3) {
          message.recipientStickerCount = 1;
        }
      }

      if (message.senderSticker !== message.recipientSticker) {
        message.recipientStickerCount = 1;
      }

      if (message.senderSticker === message.recipientSticker) {
        message.senderStickerCount = (message.senderStickerCount || 1) + 1;
      }

      this.isEmojiPickerVisible = false;
      this.messageIdHovered = null;
    } else {
      // ============= Der aktuelle User ist NICHT der Sender =============
      message.recipientChoosedStickerBackColor = emoji;
      message.stickerBoxCurrentStyle = true;

      // Toggling recipientSticker
      if (message.recipientSticker === emoji) {
        message.recipientSticker = '';
        if (message.recipientStickerCount === 2) {
          message.recipientStickerCount = 1;
        }
      } else {
        message.recipientSticker = emoji;
        message.recipientStickerCount = 1;
      }

      // Falls Sender denselben Sticker hat
      if (message.senderSticker === emoji) {
        message.senderStickerCount = (message.senderStickerCount || 1) + 1;
        if (message.senderStickerCount >= 3) {
          message.senderStickerCount = 1;
        }
      }

      if (message.recipientSticker !== '' && message.senderStickerCount === 2) {
        message.senderStickerCount = 1;
        message.recipientSticker = emoji;
      }

      if (message.recipientSticker === message.senderSticker) {
        message.senderStickerCount = (message.senderStickerCount || 1) + 1;
      }

      this.isEmojiPickerVisible = false;
      this.messageIdHovered = null;
    }

    // 3) Firestore-Update
    if (!message.id) {
      console.error('Keine Message-ID gefunden');
      return;
    }
    const stickerRef = doc(this.firestore, 'messages', message.id);

    // Objekt für Firestore
    const stikerObj = {
      senderSticker: message.senderSticker || '',
      senderStickerCount: message.senderStickerCount || 0,
      recipientSticker: message.recipientSticker || '',
      recipientStickerCount: message.recipientStickerCount || 0,
      senderchoosedStickereBackColor:
        message.senderchoosedStickereBackColor || '',
      recipientChoosedStickerBackColor:
        message.recipientChoosedStickerBackColor || '',
      stickerBoxCurrentStyle: message.stickerBoxCurrentStyle || false,
      stickerBoxOpacity: message.stickerBoxOpacity || 1,
      lastUsedEmoji: message.lastUsedEmoji || '',
    };
    await updateDoc(stickerRef, stikerObj);
    this.closePicker(); 
  }

  getReplyCountText(): string {
    const replyCount =
      this.messagesData.length > 1 ? this.messagesData.length - 1 : 0;
    if (replyCount === 1) {
      return '1 Antwort';
    } else if (replyCount > 1) {
      return `${replyCount} Antworten`;
    } else {
      return 'Keine Antworten';
    }
  }

  displayDayInfoForParent(): string {
    if (!this.pm?.timestamp) {
      return '';
    }
    const date = this.pm.timestamp as Date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return 'Heute';
    } else if (this.isSameDay(date, yesterday)) {
      return 'Gestern';
    } else {
      return this.formatDate(date);
    }
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
}
