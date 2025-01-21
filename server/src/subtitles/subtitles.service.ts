import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SubtitlesService {
  private readonly tempDir: string;

  constructor() {
    this.tempDir = path.resolve(__dirname, '../../temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  async generateSRTFromMarks(marks: any[], filename: string): Promise<string> {
    try {
      const srtLines = [];

      marks.forEach((mark, index) => {
        if (mark.type === 'sentence') {
          const startTime = this.msToSRTTime(mark.time); 

          let endTime: string;

          // Si ce n'est pas la dernière phrase, le temps de fin est le temps de début de la phrase suivante
          if (index < marks.length - 1) {
            const nextPhraseTime = marks[index + 1].time;
            endTime = this.msToSRTTime(nextPhraseTime);
          } else {
            // Dernière phrase : on ajoute 2 secondes après le début comme estimation
            endTime = this.msToSRTTime(mark.time + 2000);
          }

          const content = mark.value.trim(); // Le contenu du sous-titre

          // Ajout du sous-titre formaté en SRT
          srtLines.push(`${index + 1}`);
          srtLines.push(`${startTime} --> ${endTime}`);
          srtLines.push(`${content}`);
          srtLines.push(''); // Ligne vide entre chaque bloc de sous-titres
        }
      });

      const srtContent = srtLines.join('\n');
      const srtPath = path.resolve(__dirname, '../../temp', `${filename}.srt`);
      fs.writeFileSync(srtPath, srtContent, { encoding: 'utf8' });
      console.log(`Sous-titres SRT sauvegardés à : ${srtPath}`);
      return srtPath;
    } catch (error) {
      console.error(
        'Erreur lors de la génération des sous-titres SRT :',
        error,
      );
      throw new InternalServerErrorException(
        'Erreur lors de la génération des sous-titres SRT.',
      );
    }
  }

  /**
   * Génère un fichier ASS à partir des speech marks.
   * @param marks Speech marks contenant les timings des phrases.
   * @param filename Nom de fichier pour le ASS.
   * @returns Chemin vers le fichier ASS généré.
   */
  async generateASSFromMarks(marks: any[], filename: string): Promise<string> {
    try {
      const assLines = [];

      // En-têtes ASS
      assLines.push('[Script Info]');
      assLines.push('ScriptType: v4.00+');
      assLines.push('PlayResX: 1920');
      assLines.push('PlayResY: 1080');
      assLines.push('');

      // Styles
      assLines.push('[V4+ Styles]');
      assLines.push(
        'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      );
      // Style blanc avec contour noir
      assLines.push(
        'Style: Default,Leelawadee UI,54,&H003EFFF3,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,0.5,2,10,10,30,1',
      );
      assLines.push('');

      // Events
      assLines.push('[Events]');
      assLines.push(
        'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      );

      // Récupérer uniquement les phrases
      const sentences = marks.filter((mark) => mark.type === 'sentence');
      const words = marks.filter((mark) => mark.type === 'word');

      // Pour chaque phrase
      sentences.forEach((sentence, index) => {
        const startTime = this.msToASSTime(sentence.time);
        const endTime =
          index < sentences.length - 1
            ? this.msToASSTime(sentences[index + 1].time)
            : this.msToASSTime(words[words.length - 1].time + 1000);

        // Trouver les mots qui appartiennent à cette phrase
        const sentenceWords = words.filter(
          (word) => word.start >= sentence.start && word.end <= sentence.end,
        );

        let text = '';
        sentenceWords.forEach((word, wordIndex) => {
          const nextWord = sentenceWords[wordIndex + 1];
          const duration = nextWord ? nextWord.time - word.time : 500;

          // Réorganiser les balises d'override: \c avant \k
          text += `{\\k${Math.round(duration / 10)}}${word.value}`;
          if (wordIndex < sentenceWords.length - 1) text += ' ';
        });

        assLines.push(
          `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}`,
        );
      });

      const assContent = assLines.join('\n');
      const assPath = path.resolve(this.tempDir, `${filename}.ass`);
      fs.writeFileSync(assPath, assContent, 'utf8');

      return assPath;
    } catch (error) {
      console.error('Erreur lors de la génération des sous-titres ASS:', error);
      throw new InternalServerErrorException(
        'Erreur lors de la génération des sous-titres ASS',
      );
    }
  }

  /**
   * Convertit des millisecondes en format SRT (HH:MM:SS,mmm).
   * @param ms Millisecondes.
   * @returns Durée au format SRT.
   */
  private msToSRTTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    const date = new Date(totalSeconds * 1000);
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    const ss = String(date.getUTCSeconds()).padStart(2, '0');
    const mmm = String(milliseconds).padStart(3, '0');
    return `${hh}:${mm}:${ss},${mmm}`;
  }

  /**
   * Convertit des millisecondes en format ASS (H:MM:SS.mm).
   * @param ms Millisecondes.
   * @returns Durée au format ASS.
   */
  private msToASSTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10); // Convertir les millisecondes en centièmes de seconde
    const date = new Date(totalSeconds * 1000);

    const hh = date.getUTCHours(); // Nombre d'heures
    const mm = String(date.getUTCMinutes()).padStart(2, '0'); // Minutes avec zéro initial
    const ss = String(date.getUTCSeconds()).padStart(2, '0'); // Secondes avec zéro initial

    // Toujours inclure les heures, même si elles sont zéro
    const hoursPart = `${hh}`;
    return `${hoursPart}:${mm}:${ss}.${String(milliseconds).padStart(2, '0')}`;
  }
}
