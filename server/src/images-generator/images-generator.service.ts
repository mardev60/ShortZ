import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import * as sharp from 'sharp';
import * as FormData from 'form-data';

@Injectable()
export class ImagesGeneratorService {
  private IMGBB_API_KEY = process.env.IMGBB_API;

  private async getImagesFromRunpod(query: string[]): Promise<string[]> {
    const apiToken = process.env.RUNPOD_API; 
    const requests = query.map((prompt) =>
      axios.post('https://api.runpod.ai/v2/9oj46z7k5inkxh/runsync',{
        input: {
          prompt: prompt,
          width: 900,
          height: 1600,
        },
      }, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }),
    );
  
    try {
      const responses = await Promise.all(requests);
      console.log('Réponses de Runpod :', responses[0].data.output.images[0]);
      return responses.map((response) => response.data?.output.images[0] || '');
    } catch (error) {
      throw new InternalServerErrorException(
        `Erreur lors de la génération des images : ${error.message}`,
      );
    }
  }  

  public async getImages(query: string[]): Promise<string[]> {
    try {
      // 1) Génération des images en base64 depuis Runpod
      const base64Images = await this.getImagesFromRunpod(query);

      // 2) Redimensionnement des images
      const resizedImages = await Promise.all(
        base64Images.map(async (base64Image) => {
          const cleanedBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(cleanedBase64, 'base64');
          const resizedBuffer = await sharp(imgBuffer)
            .resize(1080, 1920, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toBuffer();

          const resizedBase64 = resizedBuffer.toString('base64');

          console.log('Image redimensionnée :', resizedBase64.slice(0, 50));

          return resizedBase64;
        })
      );

      // 3) Envoi en parallèle de chaque image redimensionnée vers ImgBB
      const uploadRequests = resizedImages.map((base64Image) => {
        const form = new FormData();
        form.append('image', base64Image);
        form.append('expiration', '3600');

        return axios.post(`https://api.imgbb.com/1/upload?key=${this.IMGBB_API_KEY}`, form, {
          headers: form.getHeaders(),
        });
      });

      const uploadResponses = await Promise.all(uploadRequests);

      // 4) Récupérer les URLs d’ImgBB
      const urls = uploadResponses.map((res) => res.data?.data?.display_url || '');

      return urls;
    } catch (error: any) {
      console.error('Erreur lors de l\'upload vers ImgBB:', error.response?.data || error.message);
      
      throw new InternalServerErrorException(
        `Erreur lors de l'upload vers ImgBB : ${error.message}`,
      );
    }
  }
}