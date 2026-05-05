import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import { MessageLogFilterInput } from './dto/message-log.input';
import {
  MessageLogEntity,
  MessageLogPageEntity,
} from './entities/message-log.entity';
import { MessageLogUseCases } from './use-cases/message-log.use-cases';

@Resolver(() => MessageLogEntity)
@UseGuards(GqlAuthGuard)
export class MessageLogResolver {
  constructor(
    private readonly useCases: MessageLogUseCases,
    private readonly tenancy: TenancyService,
  ) {}

  @Query(() => MessageLogPageEntity)
  async messageLogs(
    @CurrentUser() user: AuthUser,
    @Args('filter', { nullable: true }) filter?: MessageLogFilterInput,
  ): Promise<MessageLogPageEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.useCases.list(companyId, filter ?? {});
  }
}
