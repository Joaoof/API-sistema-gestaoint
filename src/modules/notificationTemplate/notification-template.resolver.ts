import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationChannel } from '@prisma/client';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import {
  CreateNotificationTemplateInput,
  UpdateNotificationTemplateInput,
} from './dto/notification-template.input';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationTemplateUseCases } from './use-cases/notification-template.use-cases';

@Resolver(() => NotificationTemplateEntity)
@UseGuards(GqlAuthGuard)
export class NotificationTemplateResolver {
  constructor(
    private readonly useCases: NotificationTemplateUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [NotificationTemplateEntity])
  async notificationTemplates(
    @CurrentUser() user: AuthUser,
    @Args('channel', { type: () => NotificationChannel, nullable: true })
    channel?: NotificationChannel,
    @Args('activeOnly', { nullable: true }) activeOnly?: boolean,
  ): Promise<NotificationTemplateEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, channel, activeOnly);
  }

  @Query(() => NotificationTemplateEntity)
  async notificationTemplate(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<NotificationTemplateEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.findById(companyId, id);
  }

  @Mutation(() => NotificationTemplateEntity)
  async createNotificationTemplate(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateNotificationTemplateInput,
  ): Promise<NotificationTemplateEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.create({ userId: user.id!, companyId }, input);
  }

  @Mutation(() => NotificationTemplateEntity)
  async updateNotificationTemplate(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('input') input: UpdateNotificationTemplateInput,
  ): Promise<NotificationTemplateEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.update({ userId: user.id!, companyId }, id, input);
  }

  @Mutation(() => Boolean)
  async deleteNotificationTemplate(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.remove({ userId: user.id!, companyId }, id);
  }
}
