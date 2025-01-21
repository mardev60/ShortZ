import { Module } from '@nestjs/common';
import { VideoGeneratorController } from './video-generator.controller';
import { VideoGeneratorService } from './video-generator.service';
import { ScriptService } from '../script/script.service';
import { ConfigModule } from '@nestjs/config';
import { TextToSpeechService } from 'src/text-to-speech/text-to-speech.service';
import { ImagesGeneratorService } from 'src/images-generator/images-generator.service';
import { VideoAssemblyService } from 'src/video-assembly/video-assembly.service';
import { SubtitlesService } from 'src/subtitles/subtitles.service';

@Module({
  imports: [ConfigModule],
  controllers: [VideoGeneratorController],
  providers: [VideoGeneratorService, ScriptService, TextToSpeechService, ImagesGeneratorService, VideoAssemblyService, SubtitlesService],
})
export class VideoServiceModule {}
