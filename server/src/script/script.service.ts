import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class ScriptService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API,
    });
  }

  async generateScript(topic: string): Promise<any> {
    try {
      const systemPrompt = `
        Tu es un assistant qui génère des scripts de voix et des prompts d'images pour des vidéos TikTok. 
        Tes scripts doivent être concis, clairs et parfaitement adaptés pour une narration. 
        N'inclus aucun contexte supplémentaire, émoticônes, ou styles décoratifs. 
        Tu réponds par des phrases courtes et complètes.
        Concentre-toi uniquement sur le contenu textuel nécessaire pour la voix. 
        Les prompts d'images doivent être complets, précis et clairs pour l'IA qui les recevra, incluant les détails sur les personnages, l'environnement, les objets, et le style artistique désiré.
        Exemple de réponse : 
        {
          script: "..."
          imagesPrompts: ["...", "...", "...", "..."]
        }
      `;
  
      const userPrompt = `
        Génère un script de voix en français pour une vidéo TikTok d'une durée maximale de 1 minute sur le thème suivant : "${topic}". 
        Tu ne fais pas de phrases longues, tu fais des phrases courtes et complètes.
        Le script doit être concis, clair et adapté pour une narration inspirante et drôle. 
        N'inclus aucun contexte supplémentaire, émoticônes ou styles décoratifs.
        Pour les prompts d'images, inclure les détails suivants :
        - Personnage principal : apparence, vêtements, accessoires
        - Environnement : décor, éclairage, couleurs dominantes
        - Style artistique : réel, futuriste
        Retourne le résultat sous forme d'un objet JSON contenant le script et 4 prompts pour générer des images en anglais, chacun décrivant une scène ou un élément spécifique avec le plus de détail possible.
      `;
  
      const response = await this.openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        model: 'deepseek-chat',
        response_format: {type: 'json_object'},
      });
  
      const script = response.choices[0]?.message?.content?.trim();
      const cleanScript = script.replace(/🎉|🚀|—|_/g, '').trim();
  
      return JSON.parse(cleanScript);
    } catch (error) {
      console.error('Erreur lors de la génération du script :', error);
      throw new HttpException('Erreur lors de la génération du script.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }  
}