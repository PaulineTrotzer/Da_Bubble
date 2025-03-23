import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { InputfieldService } from '../services/inputfield.service';

@Component({
  selector: 'app-files-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './files-preview.component.html',
  styleUrl: './files-preview.component.scss',
})
export class FilesPreviewComponent implements OnInit {
  selectedFiles: any = [];
  @Input() currentComponentId!: string;
  inputFieldService = inject(InputfieldService);
  activeComponentId!: string;
  @Output() previewUpdated = new EventEmitter<boolean>();
  @Output() resetErrors = new EventEmitter<void>();

  ngOnInit(): void {
    this.inputFieldService.activeComponentId$.subscribe((id) => {
      this.activeComponentId = id;
    });

    this.inputFieldService.files$.subscribe((filesByComponent) => {
      this.selectedFiles = filesByComponent[this.currentComponentId] || [];
    });
  }


  deleteFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.inputFieldService.updateFiles(
      this.currentComponentId,
      this.selectedFiles
    );
    this.previewUpdated.emit(this.selectedFiles.length > 0);
    this.resetErrors.emit();
  }
}
