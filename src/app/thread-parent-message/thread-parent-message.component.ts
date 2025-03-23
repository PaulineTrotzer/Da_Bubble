import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
} from '@angular/core';
import { Firestore, deleteDoc, doc, updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent } from '@angular/material/card';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { GlobalVariableService } from '../services/global-variable.service';
import { MentionThreadService } from '../services/mention-thread.service';
import { fadeIn, slideIn } from './component.animation';

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
  animations: [fadeIn, slideIn],
})
export class ThreadParentMessageComponent implements OnInit {
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
  mentionService = inject(MentionThreadService);
  isEmojiPickerVisible = false;
  isEmojiPickerEditVisible = false;
  firestore = inject(Firestore);
  wasClickedInDirectThread = false;
  @Output() toggleOptionBarEvent = new EventEmitter<{
    messageId: string;
    show: boolean;
  }>();
  @Output() toggleEditOptionEvent = new EventEmitter<{
    messageId: string;
    show: boolean;
  }>();
  getAllUsersName: any[] = [];
  isReadyToShow = false;
  messageIdHovered: string | null = null;
  showPopUpSender: { [key: string]: boolean } = {};
  showPopUpRecipient: { [key: string]: boolean } = {};

  async ngOnInit() {
    await this.mentionService.getAllUsersname();
    this.getAllUsersName = this.mentionService.allUsersName;
  }

  toggleEditOption(messageId: string, show: boolean) {
    this.showEditOption[messageId] = show;
  }

  toggleOptionBar(messageId: string, show: boolean) {
    this.showOptionBar[messageId] = show;
  }

  handleClickOnMention(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains('mention-message')) {
      const mentionName = target.textContent?.trim();
      if (mentionName) {
        if (this.getAllUsersName.length === 0) {
          console.warn('Mentions-Daten sind noch nicht geladen.');
          return;
        }
        this.handleMentionClick(mentionName);
      }
    }
  }
  @Output() mentionClicked = new EventEmitter<string>();

  async handleMentionClick(mention: string) {
    this.mentionClicked.emit(mention);
    const cleanName = mention.substring(1).trim().toLowerCase();
    const user = await this.mentionService.ensureUserDataLoaded(cleanName);
    if (!user) {
      console.warn('[handleMentionClick] No user found for:', mention);
      return;
    }
    this.global.getUserByName = user;
    this.global.openMentionMessageBox = true;
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
    const docPath = `messages/${pm.id}`;
    const messageRef = doc(this.firestore, docPath);

    try {
      if (!this.editableMessageText.trim()) {
        await deleteDoc(messageRef);
      } else {
        const updatedFields = {
          text: this.editableMessageText.trim(),
          editedTextShow: true,
          editedAt: new Date().toISOString(),
        };
        await updateDoc(messageRef, updatedFields);
      }
    } catch (error) {
      console.error('Error in saveOrDeleteParentMessage:', error);
    }
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

  async addEmoji(event: any, message: any) {
    const chosenEmoji = event?.emoji?.native;
    const emoji = event?.emoji?.native;
    if (!emoji) {
      console.error('Kein Emoji im Event gefunden');
      return;
    }
    message.lastUsedEmoji = chosenEmoji;
    if (this.global.currentUserData?.id === message.senderId) {
      message.senderchoosedStickereBackColor = emoji;
      message.stickerBoxCurrentStyle = true;
      if (message.senderSticker === emoji) {
        message.senderSticker = '';
        if (message.senderStickerCount === 2) {
          message.senderStickerCount = 1;
        }
      } else {
        message.senderSticker = emoji;
        message.senderStickerCount = 1;
      }
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
      message.recipientChoosedStickerBackColor = emoji;
      message.stickerBoxCurrentStyle = true;
      if (message.recipientSticker === emoji) {
        message.recipientSticker = '';
        if (message.recipientStickerCount === 2) {
          message.recipientStickerCount = 1;
        }
      } else {
        message.recipientSticker = emoji;
        message.recipientStickerCount = 1;
      }
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
    if (!message.id) {
      console.error('Keine Message-ID gefunden');
      return;
    }
    const stickerRef = doc(this.firestore, 'messages', message.id);
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
    await this.storeLastUsedEmojiGlobally(chosenEmoji);
    this.closePicker();
  }

  toggleReactionSenderInfo(id: string, show: boolean) {
    this.showPopUpSender[id] = show;
  }

  showPopUpBoth: { [messageId: string]: boolean } = {};

  toggleReactionBothInfo(msgId: string, show: boolean) {
    this.showPopUpBoth[msgId] = show;
  }

  toggleReactionRecipientInfo(id: string, show: boolean) {
    this.showPopUpRecipient[id] = show;
  }

  async storeLastUsedEmojiGlobally(emoji: string) {
    if (!this.currentUser?.uid) {
      console.warn('Kein currentUser.uid vorhanden!');
      return;
    }
    const userDocRef = doc(this.firestore, 'users', this.currentUser.uid);
    await updateDoc(userDocRef, { lastUsedEmoji: emoji });
  }

  getReplyCountText(): string {
    const replyCount = this.messagesData.length;
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

  applyGlobalEmoji(emoji: string, parentMessage: any) {
    const fakeEvent = { emoji: { native: emoji } };
    this.addEmoji(fakeEvent, parentMessage);
  }
}
