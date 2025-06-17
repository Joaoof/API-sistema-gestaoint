import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100
    }]),
    BullModule.forRoot({
      redis: {
        host: '',
        port: 
      }
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
