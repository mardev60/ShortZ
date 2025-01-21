import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PollyClient, SynthesizeSpeechCommand, SynthesizeSpeechCommandInput, SynthesizeSpeechCommandOutput } from '@aws-sdk/client-polly';
import * as fs from 'fs';
import * as path from 'path';
import { SubtitlesService } from 'src/subtitles/subtitles.service';

@Injectable()
export class TextToSpeechService {
  private polly: PollyClient;
  private readonly tempDir: string;

  constructor(private subtitlesService: SubtitlesService) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException('Configuration AWS manquante.');
    }

    this.polly = new PollyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.tempDir = path.resolve(__dirname, '../../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Synthétise la parole et génère les sous-titres synchronisés.
   * @param text Texte à synthétiser.
   * @param filename Préfixe pour les fichiers audio et SRT.
   * @returns Chemins vers les fichiers audio et SRT générés.
   */
  async synthesizeSpeechWithMarks(text: string, filename: string): Promise<{ audioPath: string; srtPath: string, assPath: string }> {
    console.log('Synthèse vocale de :', text);
    try {
      // 1. Synthèse de l'audio
      const audioParams: SynthesizeSpeechCommandInput = {
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: 'Celine',
      };

      const audioCommand = new SynthesizeSpeechCommand(audioParams);
      const audioResponse: SynthesizeSpeechCommandOutput = await this.polly.send(audioCommand);

      if (!audioResponse.AudioStream) {
        throw new InternalServerErrorException('Aucun flux audio reçu de Polly.');
      }

      const audioBuffer = Buffer.from(await this.streamToBuffer(audioResponse.AudioStream));
      const audioPath = path.resolve(this.tempDir, `${filename}.mp3`);
      fs.writeFileSync(audioPath, audioBuffer);
      console.log(`Audio sauvegardé à : ${audioPath}`);

      // 2. Récupération des Speech Marks
      const marksParams: SynthesizeSpeechCommandInput = {
        Text: text,
        OutputFormat: 'json',
        VoiceId: 'Celine',
        SpeechMarkTypes: ['word', 'sentence'],
      };

      const marksCommand = new SynthesizeSpeechCommand(marksParams);
      const marksResponse = await this.polly.send(marksCommand);

      if (!marksResponse.AudioStream) {
        throw new InternalServerErrorException('Aucun flux de speech marks reçu de Polly.');
      }

      const marksData = await this.parseSpeechMarks(marksResponse.AudioStream);

      // 3. Génération du fichier SRT basé sur les Speech Marks
      //const srtPath = await this.subtitlesService.generateSRTFromMarks(marksData, filename);
      const assPath = await this.subtitlesService.generateASSFromMarks(marksData, filename);
      const srtPath = '';

      return { audioPath, srtPath, assPath };
    } catch (error) {
      console.error('Erreur AWS Polly TTS :', error);
      throw new InternalServerErrorException('Erreur lors de la synthèse vocale.');
    }
  }

  /**
   * Convertit un flux en Buffer.
   * @param stream Flux de données.
   * @returns Buffer contenant les données du flux.
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Parse les Speech Marks JSON.
   * @param stream Flux contenant les speech marks.
   * @returns Tableau d'objets représentant les speech marks.
   */
  private async parseSpeechMarks(stream: any): Promise<any[]> {
    const buffer = await this.streamToBuffer(stream);
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const marks = lines.map(line => JSON.parse(line));
    return marks;
  }
}