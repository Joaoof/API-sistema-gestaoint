import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { AuthUser, getUserId } from '../construction/shared/auth-user';
import { TenancyService } from '../construction/shared/tenancy.service';
import {
  CalendarRangeInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from './dto/calendar-event.input';
import {
  CalendarEventEntity,
  CalendarItemEntity,
} from './entities/calendar-event.entity';
import { AgendaSummaryService } from './use-cases/agenda-summary.service';
import { CalendarService } from './use-cases/calendar.service';

@Resolver(() => CalendarEventEntity)
@UseGuards(GqlAuthGuard)
export class CalendarResolver {
  constructor(
    private readonly service: CalendarService,
    private readonly summary: AgendaSummaryService,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => [CalendarItemEntity], {
    description:
      'Retorna eventos, lembretes, contas, entregas, contratos e ordens dentro do range. Aplica RRULE.',
  })
  async calendarItems(
    @CurrentUser() user: AuthUser,
    @Args('range') range: CalendarRangeInput,
  ): Promise<CalendarItemEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.items(companyId, range);
  }

  @Query(() => CalendarEventEntity)
  async calendarEvent(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<CalendarEventEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.findOne(companyId, id);
  }

  @Mutation(() => CalendarEventEntity)
  async createCalendarEvent(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateCalendarEventInput,
  ): Promise<CalendarEventEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.create(companyId, getUserId(user) ?? null, input);
  }

  @Mutation(() => CalendarEventEntity)
  async updateCalendarEvent(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpdateCalendarEventInput,
  ): Promise<CalendarEventEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.update(companyId, input);
  }

  @Mutation(() => Boolean)
  async deleteCalendarEvent(
    @CurrentUser() user: AuthUser,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.remove(companyId, id);
  }

  @Mutation(() => Boolean, {
    description: 'Cancela uma ocorrência específica de uma série recorrente.',
  })
  async cancelCalendarOccurrence(
    @CurrentUser() user: AuthUser,
    @Args('eventId') eventId: string,
    @Args('occurrence') occurrence: Date,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.cancelOccurrence(companyId, eventId, occurrence);
  }

  @Mutation(() => String, {
    description:
      'Gera um resumo executivo (via IA) da agenda do dia ou da semana. Inclui eventos, lembretes e contas.',
  })
  async summarizeAgenda(
    @CurrentUser() user: AuthUser,
    @Args('period', { description: 'DAY ou WEEK' }) period: string,
    @Args('referenceDate', {
      nullable: true,
      description: 'Default = hoje',
    })
    referenceDate?: Date,
    @Args('sources', { type: () => [String], nullable: true })
    sources?: string[],
  ): Promise<string> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const p = period?.toUpperCase() === 'WEEK' ? 'WEEK' : 'DAY';
    return this.summary.summarize({
      companyId,
      period: p,
      referenceDate: referenceDate ?? new Date(),
      sources: sources ?? null,
    });
  }
}
