import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminResolver } from './admin.resolver';
import { AdminPermissionsService } from './use-cases/admin-permissions.service';
import { AdminUsersService } from './use-cases/admin-users.service';

@Module({
  imports: [PrismaModule],
  providers: [AdminResolver, AdminUsersService, AdminPermissionsService],
})
export class AdminModule {}
