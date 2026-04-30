import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { R2Service, SignedUploadResult } from '../../infra/services/r2/r2.service';
import { SignUploadDto } from './dto/sign-upload.dto';

/**
 * Endpoints REST para upload assinado direto ao Cloudflare R2.
 * Frontend chama /sign, recebe uploadUrl, e faz PUT direto no R2.
 */
@Controller('api/storage')
@UseGuards(AuthGuard('jwt'))
export class StorageController {
  constructor(private readonly r2: R2Service) {}

  @Post('sign')
  @HttpCode(HttpStatus.OK)
  async sign(@Body() dto: SignUploadDto): Promise<SignedUploadResult> {
    try {
      return await this.r2.signUpload({
        filename: dto.filename,
        contentType: dto.contentType,
        size: dto.size,
        folder: dto.folder ?? 'misc',
      });
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Falha ao gerar URL de upload',
      );
    }
  }

  /**
   * Remove um asset por key. A `:key` aceita barras (products/uuid-x.jpg).
   */
  @Delete(':key(*)')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('key') key: string): Promise<void> {
    await this.r2.delete(decodeURIComponent(key));
  }
}
