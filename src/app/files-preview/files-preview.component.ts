import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputfieldService } from '../services/inputfield.service';

@Component({
  selector: 'app-files-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './files-preview.component.html',
  styleUrl: './files-preview.component.scss',
})
export class FilesPreviewComponent implements OnInit, OnDestroy {
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

  ngOnDestroy(): void {}

  deleteFile(index: number) {
    this.selectedFiles.splice(index, 1); // Entferne die Datei lokal
    this.inputFieldService.updateFiles(this.currentComponentId, this.selectedFiles); // Aktualisiere die Dateien im Service
    this.previewUpdated.emit(this.selectedFiles.length > 0); // Emitte den neuen Status
    this.resetErrors.emit();
  }
}
