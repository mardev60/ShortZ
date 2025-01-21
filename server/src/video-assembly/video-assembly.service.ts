import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from 'ffmpeg-static';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

@Injectable()
export class VideoAssemblyService {
  private readonly tempDir: string;
  private readonly width: number = 1080; 
  private readonly height: number = 1920;
  private readonly fps: number = 30;

  constructor() {
    this.tempDir = path.resolve(__dirname, '../../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Assemble une vidéo à partir d'une liste d'URLs d'images, d'une piste audio et d'un fichier SRT.
   * @param imageUrls Liste d'URLs d'images.
   * @param audioPath Chemin vers le fichier audio.
   * @param srtPath Chemin vers le fichier SRT.
   * @param outputFilename Nom de fichier pour la vidéo finale.
   * @returns Chemin vers la vidéo générée.
   */
  async assembleVideo(
    imageUrls: string[],
    audioPath: string,
    srtPath: string,
    assPath: string,
    outputFilename: string,
  ): Promise<string> {
    const uniqueId = uuidv4();
    const tempDir = path.resolve(__dirname, '../../temp', uniqueId);
  
    try {
      // (1) Créer un répertoire temporaire
      await mkdir(tempDir, { recursive: true });
  
      // (2) Télécharger les images
      const downloadedImages = await this.downloadImages(imageUrls, tempDir);
      if (downloadedImages.length === 0) {
        throw new InternalServerErrorException("Aucune image n'a été téléchargée.");
      }
  
      // Obtenir la durée audio
      const audioDuration = await this.getAudioDuration(audioPath);
      const imageDuration = audioDuration / downloadedImages.length;
  
      // (3) Créer la vidéo directement à partir des images avec l'effet de zoom
      const videoPath = path.resolve(tempDir, `${uniqueId}_video.mp4`);
      await this.createVideoFromImages(downloadedImages, imageDuration, videoPath);
  
      // (4) Ajouter l'audio à la vidéo
      const videoWithAudioPath = path.resolve(tempDir, `${uniqueId}_with_audio.mp4`);
      await this.addAudioToVideo(videoPath, audioPath, videoWithAudioPath);
  
      // (5) Ajouter les sous-titres à la vidéo
      const videoWithSubtitlesPath = path.resolve(
        this.tempDir,
        `${outputFilename}-final.mp4`,
      );
  
      await this.addSubtitlesToVideo(
        videoWithAudioPath,
        assPath,
        videoWithSubtitlesPath,
      );
  
      // (6) Nettoyer
      //await this.cleanupTempDir(tempDir, [videoPath, videoWithAudioPath]);
  
      return videoWithSubtitlesPath;
    } catch (error) {
      console.error(
        "Erreur lors de l'assemblage de la vidéo avec sous-titres:",
        error.message,
      );
      throw new InternalServerErrorException(
        "Impossible de terminer l'assemblage de la vidéo avec sous-titres.",
      );
    }
  }  

  /**
   * Télécharge les images à partir des URLs fournies.
   * @param imageUrls Liste d'URLs d'images.
   * @param downloadDir Répertoire où les images seront téléchargées.
   * @returns Liste des chemins locaux des images téléchargées.
   */
  private async downloadImages(
    imageUrls: string[],
    downloadDir: string,
  ): Promise<string[]> {
    const downloadPromises = imageUrls.map(async (url, index) => {
      try {
        const response = await axios.get(url, { responseType: 'stream' });
        const imagePath = path.resolve(downloadDir, `image${index + 1}.jpg`);
        const writer = fs.createWriteStream(imagePath);

        response.data.pipe(writer);

        return new Promise<string>((resolve, reject) => {
          writer.on('finish', () => resolve(imagePath));
          writer.on('error', reject);
        });
      } catch (error) {
        console.error(
          `Erreur lors du téléchargement de l'image: ${url}`,
          error.message,
        );
        return null; // Retourne null en cas d'erreur pour ignorer l'image
      }
    });

    const results = await Promise.all(downloadPromises);
    return results.filter((imagePath) => imagePath !== null);
  }

  /**
   * Génère une vidéo à partir des images listées dans le fichier de liste.
   * @param fileListPath Chemin vers le fichier de liste d'images pour FFmpeg.
   * @param videoPath Chemin où la vidéo sera sauvegardée.
   */
  private async createVideoFromImages(
    images: string[],
    duration: number,
    outputPath: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
  
      // Input de chaque image
      images.forEach((image) => {
        command.input(image);
      });
  
      // Créer le filtre complexe pour le zoom
      const filterComplex = images
        .map((_, index) => {
          // Forcer le redimensionnement à une taille fixe avant le zoom
          return `[${index}:v]scale=${this.width}:${this.height}:force_original_aspect_ratio=decrease,pad=${this.width}:${this.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,zoompan=z='min(zoom+0.0001,1.2)':d=${duration*this.fps}:s=${this.width}x${this.height}:fps=${this.fps}[v${index}]`;
        })
        .join(';');
  
      // Concaténer toutes les séquences
      const concatInputs = images.map((_, index) => `[v${index}]`).join('');
      const completeFilterComplex = `${filterComplex};${concatInputs}concat=n=${images.length}:v=1:a=0[outv]`;
  
      command
        .complexFilter(completeFilterComplex, ['outv'])
        .outputOptions([
          '-c:v libx264',
          '-preset medium',
          '-pix_fmt yuv420p',
          `-r ${this.fps}`,
          '-movflags +faststart',
          '-y'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('Commande FFmpeg:', commandLine);
        })
        .on('stderr', (stderrLine) => {
          console.log('FFmpeg STDERR:', stderrLine);
        })
        .on('error', (err, stdout, stderr) => {
          console.error('Erreur lors de la création de la vidéo:', err.message);
          reject(err);
        })
        .on('end', () => {
          console.log('Vidéo créée avec succès');
          resolve();
        })
        .run();
    });
  }
   
  

  /**
   * Ajoute une piste audio à une vidéo.
   * @param videoPath Chemin vers la vidéo sans audio.
   * @param audioPath Chemin vers le fichier audio.
   * @param outputPath Chemin où la vidéo finale sera sauvegardée.
   */
  private async addAudioToVideo(
    videoPath: string,
    audioPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy',
          '-c:a aac',
          '-strict',
          'experimental',
          '-shortest',
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log("Commande FFmpeg pour ajouter l'audio :", commandLine);
        })
        .on('stderr', (stderrLine) => {
          console.log('FFmpeg STDERR (audio) :', stderrLine);
        })
        .on('error', (err) => {
          console.error(
            "Erreur lors de l'ajout de l'audio à la vidéo :",
            err.message,
          );
          reject(err);
        })
        .on('end', () => {
          console.log('Audio ajouté à la vidéo avec succès.');
          resolve();
        })
        .run();
    });
  }

  /**
   * Ajoute des sous-titres à une vidéo.
   * @param inputVideo Chemin vers la vidéo avec audio.
   * @param assFile Chemin vers le fichier ASS.
   * @param outputVideo Chemin où la vidéo finale avec sous-titres sera sauvegardée.
   */
  private async addSubtitlesToVideo(
    inputVideo: string,
    assFile: string,
    outputVideo: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        // Obtenir le chemin absolu du fichier ASS
        const absoluteSubtitlePath = path.resolve(assFile);

        // Vérifier si le fichier ASS existe
        if (!fs.existsSync(absoluteSubtitlePath)) {
          throw new Error(
            `Le fichier ASS n'existe pas : ${absoluteSubtitlePath}`,
          );
        }

        // Échappement du chemin du fichier ASS pour FFmpeg
        const escapedSubtitlePath = this.escapeFFmpegPath(absoluteSubtitlePath);

        // Encadrer le chemin échappé avec des guillemets simples
        const vfOption = `ass='${escapedSubtitlePath}'`;

        console.log('Chemin complet du fichier ASS:', absoluteSubtitlePath);
        console.log(
          'Chemin échappé pour les sous-titres:',
          escapedSubtitlePath,
        );
        console.log('Option VF:', vfOption);

        ffmpeg()
          .input(inputVideo)
          .videoFilter(vfOption)
          .outputOptions([
            '-map 0:v',
            '-map 0:a',
            '-c:a copy',
            '-c:v libx264',
            '-preset medium',
            '-vsync 1',
            '-max_muxing_queue_size 1024' 
          ])
          .output(outputVideo)
          .on('start', (commandLine) => {
            console.log('Commande FFmpeg pour les sous-titres:', commandLine);
          })
          .on('stderr', (stderrLine) => {
            console.log('FFmpeg STDERR:', stderrLine);
          })
          .on('error', (err, stdout, stderr) => {
            console.error(
              "Erreur lors de l'ajout des sous-titres :",
              err.message,
            );
            reject(err);
          })
          .on('end', () => {
            console.log('Sous-titres ajoutés avec succès.');
            resolve();
          })
          .run();
      } catch (error) {
        console.error('Erreur dans addSubtitlesToVideo:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Échappe les backslashes et les deux-points dans un chemin de fichier pour FFmpeg filtergraph.
   * @param filePath Chemin du fichier à échapper.
   * @returns Chemin échappé.
   */
  private escapeFFmpegPath(filePath: string): string {
    return filePath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  }

  /**
   * Supprime les fichiers et répertoires temporaires.
   * @param dirPath Chemin vers le répertoire temporaire.
   * @param files Liste des fichiers à supprimer.
   */
  private async cleanupTempDir(
    dirPath: string,
    files: string[] = [],
  ): Promise<void> {
    try {
      // Supprimer les fichiers spécifiés
      for (const file of files) {
        try {
          await unlink(file);
        } catch (err) {
          console.warn(
            `Impossible de supprimer le fichier: ${file}`,
            err.message,
          );
        }
      }

      // Supprimer le répertoire temporaire et son contenu
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log('Fichiers temporaires nettoyés.');
    } catch (error) {
      console.error(
        'Erreur lors du nettoyage des fichiers temporaires :',
        error.message,
      );
    }
  }

  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata.format.duration || 0);
      });
    });
  }
}
