import { Module } from '@nestjs/common';
import { R2Module } from '../../infra/services/r2/r2.module';
import { StorageController } from './storage.controller';

@Module({
  imports: [R2Module],
  controllers: [StorageController],
})
export class StorageModule {}
