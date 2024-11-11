import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
@Component({
  selector: 'app-emoji-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.scss',
})
export class EmojiPickerComponent {
  isPickerVisible: boolean = false;
  message: string = '';

  togglePicker() {
    this.isPickerVisible = !this.isPickerVisible;
  }

  addEmoji(event: any) {
    this.message += event.emoji.native; // emoji + msg hinzufügen
    this.isPickerVisible = false;
  }
}
