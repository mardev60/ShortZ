import { Controller, Post, Body } from '@nestjs/common';
import { VideoGeneratorService } from './video-generator.service';

@Controller('generate-video')
export class VideoGeneratorController {
  constructor(private videoGeneratorService: VideoGeneratorService) {}

  @Post()
  async generateVideo(@Body('topic') topic: string): Promise<{ videoUrl: string }> {
    const videoUrl = await this.videoGeneratorService.generateVideo(topic);
    return { videoUrl };
  }
}