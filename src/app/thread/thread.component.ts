import {
  Component,
  Output,
  EventEmitter,
  inject,
  OnInit,
  Input,
} from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { GlobalVariableService } from '../services/global-variable.service';
import { User } from '../models/user.class';
import { Firestore, doc, getDoc, collection, where, query, getDocs, limit, onSnapshot } from '@angular/fire/firestore';
import { UserService } from '../services/user.service';
import { ActivatedRoute } from '@angular/router';
import { SendMessageInfo } from '../models/send-message-info.interface';
import { DirectThreadComponent } from '../direct-thread/direct-thread.component';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, DirectThreadComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})

export class ThreadComponent {
  @Output() closeThread = new EventEmitter<void>();

  constructor(){}

  @Input() selectedUser: any;

  onDirectThreadClosed() {
    this.closeThread.emit(); 
  }

}
