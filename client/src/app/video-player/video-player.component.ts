import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-video-player',
  standalone: false,
  
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.css'
})
export class VideoPlayerComponent {
  @Input() videoUrl!: string;
  @Output() downloadRequested = new EventEmitter<void>();
}
