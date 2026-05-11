import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../core/entities/user.entity';
import { TenancyService } from '../construction/shared/tenancy.service';
import { InvitationsService } from './use-cases/invitations.service';

@InputType()
class CreateInvitationInput {
  @Field() email!: string;
  @Field({ nullable: true }) role?: string;
  @Field({ nullable: true }) companyId?: string;
  @Field({ nullable: true }) planId?: string;
  @Field({ nullable: true }) message?: string;
  @Field(() => Int, { nullable: true }) expiresInDays?: number;
}

@ObjectType()
class InvitationEntity {
  @Field(() => ID) id!: string;
  @Field() email!: string;
  @Field() role!: string;
  @Field(() => String, { nullable: true }) companyId?: string | null;
  @Field(() => String, { nullable: true }) planId?: string | null;
  @Field() invitedBy!: string;
  @Field() token!: string;
  @Field(() => String, { nullable: true }) message?: string | null;
  @Field(() => Date, { nullable: true }) acceptedAt?: Date | null;
  @Field(() => Date, { nullable: true }) revokedAt?: Date | null;
  @Field() expiresAt!: Date;
  @Field() createdAt!: Date;
}

@ObjectType()
class CreatedInvitation {
  @Field(() => InvitationEntity) invitation!: InvitationEntity;
  @Field() acceptUrl!: string;
}

function toEntity(i: any): InvitationEntity {
  return {
    id: i.id,
    email: i.email,
    role: i.role,
    companyId: i.companyId,
    planId: i.planId,
    invitedBy: i.invitedBy,
    token: i.token,
    message: i.message,
    acceptedAt: i.acceptedAt,
    revokedAt: i.revokedAt,
    expiresAt: i.expiresAt,
    createdAt: i.createdAt,
  };
}

@Resolver()
@UseGuards(GqlAuthGuard)
export class InvitationsResolver {
  constructor(
    private readonly service: InvitationsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Mutation(() => CreatedInvitation)
  async createInvitation(
    @CurrentUser() user: User,
    @Args('input') input: CreateInvitationInput,
  ): Promise<CreatedInvitation> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const out = await this.service.create(
      {
        userId: user.id,
        companyId,
        isSuperAdmin: (user as any).isSuperAdmin === true,
      },
      input,
    );
    return { invitation: toEntity(out.invitation), acceptUrl: out.acceptUrl };
  }

  @Query(() => [InvitationEntity])
  async invitations(
    @CurrentUser() user: User,
    @Args('status', { nullable: true }) status?: string,
  ): Promise<InvitationEntity[]> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    const rows = await this.service.list(
      {
        userId: user.id,
        companyId,
        isSuperAdmin: (user as any).isSuperAdmin === true,
      },
      { status: status as any },
    );
    return rows.map(toEntity);
  }

  @Mutation(() => Boolean)
  async revokeInvitation(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const companyId = await this.tenancy.resolveCompanyId(user);
    await this.service.revoke(
      {
        userId: user.id,
        companyId,
        isSuperAdmin: (user as any).isSuperAdmin === true,
      },
      id,
    );
    return true;
  }
}
