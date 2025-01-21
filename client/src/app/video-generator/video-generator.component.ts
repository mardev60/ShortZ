import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: false,
  selector: 'app-video-generator',
  templateUrl: './video-generator.component.html'
})
export class VideoGeneratorComponent {
  videoForm: FormGroup;
  isLoading = false;
  error: string | null = null;
  videoUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.videoForm = this.fb.group({
      topic: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.videoForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  onSubmit() {
    if (this.videoForm.valid) {
      this.isLoading = true;
      this.error = null;
      this.videoUrl = null;

      this.http.post<{ videoUrl: string }>('http://localhost:3000/api/generate-video', {
        topic: this.videoForm.value.topic
      }).subscribe({
        next: (response) => {
          this.videoUrl = response.videoUrl;
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Une erreur est survenue lors de la génération de la vidéo.';
          this.isLoading = false;
        }
      });
    }
  }

  downloadVideo() {
    if (this.videoUrl) {
      const link = document.createElement('a');
      link.href = this.videoUrl;
      link.download = 'video.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}