// src/video-generator/video-generator.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ImagesGeneratorService } from 'src/images-generator/images-generator.service';
import { ScriptService } from 'src/script/script.service';
import { TextToSpeechService } from 'src/text-to-speech/text-to-speech.service';
import { VideoAssemblyService } from 'src/video-assembly/video-assembly.service';

@Injectable()
export class VideoGeneratorService {
  constructor(
    private scriptService: ScriptService,
    private textToSpeechService: TextToSpeechService,
    private imageGeneratorService: ImagesGeneratorService,
    private videoAssemblyService: VideoAssemblyService,
  ) {}

  async generateVideo(topic: string): Promise<any> {
    try {
      // 1. Générer le script
      const llmResult = await this.scriptService.generateScript(topic);

      // 2. Synthétiser le discours et générer les Speech Marks
      const { audioPath, srtPath, assPath } = await this.textToSpeechService.synthesizeSpeechWithMarks(
        llmResult.script,
        `audio-${Date.now()}`,
      );

      // 3. Récupérer les images (ou clips vidéo)
      const clips = await this.imageGeneratorService.getImages(llmResult.imagesPrompts);
      //console.log('Img récupérés :', clips);

      // 4. Assembler la vidéo avec l'audio et les sous-titres
      const assembledVideoPath = await this.videoAssemblyService.assembleVideo(
        clips, // Liste des chemins des images ou vidéos
        audioPath, // Chemin vers le fichier audio
        srtPath, // Chemin vers le fichier SRT
        assPath,
        `video-${Date.now()}`, // Préfixe pour le nom du fichier vidéo
      );
      console.log('Vidéo assemblée à :', assembledVideoPath);

      // 5. (Optionnel) Télécharger sur S3
      // const videoUrl = await this.s3Service.uploadFile(assembledVideoPath);

      // Retourne les chemins ou les URL des fichiers générés
      return {
        message: 'Vidéo générée avec succès.',
        videoPath: assembledVideoPath,
        // videoUrl, // Si vous utilisez S3
      };
    } catch (error) {
      console.error('Erreur lors de la génération de la vidéo :', error);
      throw new InternalServerErrorException('Erreur lors de la génération de la vidéo.');
    }
  }
}