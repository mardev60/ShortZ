import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoServiceModule } from './video-generator/video-generator.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [VideoServiceModule, ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}