import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsResolver } from './invitations.resolver';
import { InvitationsService } from './use-cases/invitations.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationsResolver],
})
export class InvitationsModule {}
