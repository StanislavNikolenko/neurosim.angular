import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../environments/environment.development';

interface UploadedFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

@Component({
  selector: 'app-data-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-upload.component.html',
  styleUrl: './data-upload.component.css'
})

export class DataUploadComponent {
  uploadedFiles: UploadedFile[] = [];
  isDragOver = false;
  isUploading = false;
  alertMessage = '';
  alertType = '';
  backendUrl = environment.backendUrl;

  constructor(private http: HttpClient) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.addFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  addFiles(files: File[]): void {
    const validFiles = files.filter(file => this.isValidFile(file));
    
    if (validFiles.length !== files.length) {
      this.showAlert('Some files were skipped due to invalid format or size', 'error');
    }

    validFiles.forEach(file => {
      this.uploadedFiles.push({
        file,
        progress: 0,
        status: 'pending'
      });
    });
  }

  isValidFile(file: File): boolean {
    const validExtensions = ['.xml', '.dat', '.nrs'];
    const maxSize = 200 * 1024 * 1024; // 200MB
    
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    return hasValidExtension && file.size <= maxSize;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  uploadFile(index: number): void {
    const fileItem = this.uploadedFiles[index];
    if (fileItem.status === 'uploading') return;

    fileItem.status = 'uploading';
    this.isUploading = true;

    const formData = new FormData();
    formData.append('file', fileItem.file);
    formData.append('type', 'neural-data');

    this.http.post(this.backendUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = Math.round(100 * event.loaded / (event.total || 1));
          fileItem.progress = progress;
        } else if (event.type === HttpEventType.Response) {
          fileItem.status = 'success';
          fileItem.progress = 100;
          this.isUploading = false;
          this.showAlert(`File ${fileItem.file.name} uploaded successfully!`, 'success');
        }
      },
      error: (error) => {
        fileItem.status = 'error';
        fileItem.error = error.message || 'Upload failed';
        this.isUploading = false;
        this.showAlert(`Failed to upload ${fileItem.file.name}: ${fileItem.error}`, 'error');
      }
    });
  }

  uploadAllFiles(): void {
    const pendingFiles = this.uploadedFiles.filter(f => f.status === 'pending');
    pendingFiles.forEach((_, index) => {
      const originalIndex = this.uploadedFiles.findIndex(f => f === pendingFiles[index]);
      this.uploadFile(originalIndex);
    });
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  hasPendingFiles(): boolean {
    return this.uploadedFiles.some(f => f.status === 'pending');
  }

  showAlert(message: string, type: 'success' | 'error' | 'info'): void {
    this.alertMessage = message;
    this.alertType = `alert-${type}`;
    
    setTimeout(() => {
      this.alertMessage = '';
      this.alertType = '';
    }, 5000);
  }
}
