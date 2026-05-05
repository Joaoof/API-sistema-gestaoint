import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { OpportunityResolver } from './opportunity.resolver';
import { OpportunityUseCases } from './use-cases/opportunity.use-cases';

@Module({
  imports: [PrismaModule],
  providers: [OpportunityResolver, OpportunityUseCases],
  exports: [OpportunityUseCases],
})
export class OpportunityModule {}
