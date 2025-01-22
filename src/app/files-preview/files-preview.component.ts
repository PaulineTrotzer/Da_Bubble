import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
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

  ngOnInit(): void {
    console.log('cuurentCoompId', this.currentComponentId);
    this.inputFieldService.activeComponentId$.subscribe((id) => {
      this.activeComponentId = id;
      console.log('Updated activeComponentId from service:', id);
    });

    // Beobachte die Dateien
    this.inputFieldService.files$.subscribe((filesByComponent) => {
      this.selectedFiles = filesByComponent[this.currentComponentId] || [];
      console.log(
        `Updated files for ${this.currentComponentId}:`,
        this.selectedFiles
      );
    });
  
  }

  ngOnDestroy(): void {}

  deleteFile(index: number) {
    this.selectedFiles.splice(index, 1); // Entferne die Datei lokal
    this.inputFieldService.updateFiles(this.currentComponentId, this.selectedFiles); // Aktualisiere die Dateien im Service
  }
}
