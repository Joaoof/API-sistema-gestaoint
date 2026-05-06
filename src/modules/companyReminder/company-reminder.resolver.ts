import { UseGuards } from '@nestjs/common';
import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { AuthUser } from '../construction/shared/auth-user';
import { TenancyService } from '../construction/shared/tenancy.service';
import { CompanyReminderEntity } from './entities/company-reminder.entity';
import { CompanyReminderService } from './use-cases/company-reminder.service';

@Resolver(() => CompanyReminderEntity)
@UseGuards(GqlAuthGuard)
export class CompanyReminderResolver {
  constructor(
    private readonly service: CompanyReminderService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [CompanyReminderEntity])
  async companyReminders(
    @CurrentUser() user: AuthUser,
    @Args('pending', { nullable: true }) pending?: boolean,
    @Args('category', { nullable: true }) category?: string,
    @Args('priority', { nullable: true }) priority?: string,
  ): Promise<CompanyReminderEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.list(companyId, {
      pending,
      category,
      priority,
    }) as Promise<CompanyReminderEntity[]>;
  }

  @Mutation(() => CompanyReminderEntity)
  async createCompanyReminder(
    @CurrentUser() user: AuthUser,
    @Args('title') title: string,
    @Args('dueAt') dueAt: Date,
    @Args('description', { nullable: true }) description?: string,
    @Args('category', { nullable: true }) category?: string,
    @Args('priority', { nullable: true }) priority?: string,
    @Args('link', { nullable: true }) link?: string,
  ): Promise<CompanyReminderEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.create(companyId, {
      title,
      description,
      category,
      priority: priority as 'low' | 'normal' | 'high' | 'critical' | undefined,
      link,
      dueAt,
      createdBy: user.id ?? user.sub ?? null,
    }) as Promise<CompanyReminderEntity>;
  }

  @Mutation(() => Boolean)
  async toggleCompanyReminderDone(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('done') done: boolean,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    await this.service.toggleDone(companyId, id, done);
    return true;
  }

  @Mutation(() => Boolean)
  async snoozeCompanyReminder(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
    @Args('minutes', { type: () => Int }) minutes: number,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    await this.service.snooze(companyId, id, minutes);
    return true;
  }

  @Mutation(() => Boolean)
  async deleteCompanyReminder(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.remove(companyId, id);
  }

  @Subscription(() => CompanyReminderEntity, {
    name: 'companyReminderDue',
    filter: (
      payload: { companyReminderDue: { companyId: string } },
      _vars: unknown,
      ctx: { user?: { companyId?: string } },
    ) =>
      !ctx?.user?.companyId ||
      ctx.user.companyId === payload.companyReminderDue.companyId,
  })
  companyReminderDue() {
    return this.service.asyncIterator();
  }
}
