import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { R2Service } from '../../../infra/services/r2/r2.service';

@Injectable()
export class DeleteProductUseCase {
  private readonly logger = new Logger(DeleteProductUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async execute(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado');

    // Soft delete + remove imagens do R2 em best-effort
    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    for (const img of product.images) {
      this.r2.delete(img.key).catch((err: unknown) =>
        this.logger.warn(
          `Falha ao remover ${img.key}: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }

    return true;
  }
}
