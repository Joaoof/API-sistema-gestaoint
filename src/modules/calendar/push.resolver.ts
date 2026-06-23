import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { AuthUser, getUserId } from '../construction/shared/auth-user';
import { TenancyService } from '../construction/shared/tenancy.service';
import { PushSubscriptionInput } from './dto/calendar-event.input';
import { WebPushService } from './use-cases/web-push.service';

@Resolver()
@UseGuards(GqlAuthGuard)
export class PushResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => String, {
    nullable: true,
    description: 'Chave VAPID pública (base64url) para o navegador se inscrever.',
  })
  webPushPublicKey(): string | null {
    return this.webPush.getPublicKey();
  }

  @Mutation(() => Boolean)
  async subscribeWebPush(
    @CurrentUser() user: AuthUser,
    @Args('input') input: PushSubscriptionInput,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const userId = getUserId(user);
    if (!userId) throw new BadRequestException('Usuário sem id.');

    await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        companyId,
        userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
      update: {
        companyId,
        userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastUsed: new Date(),
      },
    });
    return true;
  }

  @Mutation(() => Boolean)
  async unsubscribeWebPush(
    @CurrentUser() user: AuthUser,
    @Args('endpoint') endpoint: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, companyId },
    });
    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Dispara push de teste para o próprio usuário (debug).',
  })
  async testWebPush(@CurrentUser() user: AuthUser): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const userId = getUserId(user) ?? null;
    const r = await this.webPush.sendToUser({
      companyId,
      userId,
      title: '🔔 Teste de notificação',
      body: 'Se você viu isso, o Web Push tá funcionando!',
      url: '/calendario',
    });
    return r.sent > 0;
  }
}
