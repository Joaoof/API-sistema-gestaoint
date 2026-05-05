import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import { NotificationFilterInput } from './dto/notification.input';
import {
  NotificationEntity,
  NotificationPageEntity,
} from './entities/notification.entity';
import { NotificationUseCases } from './use-cases/notification.use-cases';

@Resolver(() => NotificationEntity)
@UseGuards(GqlAuthGuard)
export class NotificationResolver {
  constructor(
    private readonly useCases: NotificationUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => NotificationPageEntity)
  async notifications(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: NotificationFilterInput,
  ): Promise<NotificationPageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, user.id!, filter ?? {});
  }

  @Query(() => Int)
  async notificationsUnreadCount(
    @CurrentUser() user: AuthUser,
  ): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.unreadCount(companyId, user.id!);
  }

  @Mutation(() => NotificationEntity)
  async markNotificationRead(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<NotificationEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.markAsRead(companyId, user.id!, id);
  }

  @Mutation(() => Int)
  async markAllNotificationsRead(
    @CurrentUser() user: AuthUser,
  ): Promise<number> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.markAllAsRead(companyId, user.id!);
  }

  @Mutation(() => Boolean)
  async dismissNotification(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.dismiss(companyId, user.id!, id);
  }
}
