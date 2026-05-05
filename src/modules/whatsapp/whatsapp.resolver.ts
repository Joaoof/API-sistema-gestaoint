import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TenancyService } from '../construction/shared/tenancy.service';
import { AuthUser } from '../construction/shared/auth-user';
import { BuildWhatsappLinkInput } from './dto/whatsapp.input';
import { WhatsappLinkEntity } from './entities/whatsapp-link.entity';
import { WhatsappService } from './use-cases/whatsapp.service';

@Resolver(() => WhatsappLinkEntity)
@UseGuards(GqlAuthGuard)
export class WhatsappResolver {
  constructor(
    private readonly service: WhatsappService,
    private readonly tenancy: TenancyService,
  ) {}

  @Mutation(() => WhatsappLinkEntity)
  async buildWhatsappLink(
    @CurrentUser() user: AuthUser,
    @Args('input') input: BuildWhatsappLinkInput,
  ): Promise<WhatsappLinkEntity> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    return this.service.buildLink(companyId, input);
  }

  @Mutation(() => Boolean)
  async markWhatsappLinkOpened(
    @Args('messageLogId') messageLogId: string,
  ): Promise<boolean> {
    return this.service.markLinkOpened(messageLogId);
  }
}
