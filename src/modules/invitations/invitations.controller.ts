import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InvitationsService } from './use-cases/invitations.service';

/**
 * Endpoints PÚBLICOS (sem JWT) — só pra fluxo de aceite de convite.
 * O token é o único "segredo" que protege.
 */
@Controller('api/invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Get(':token')
  async validate(@Param('token') token: string) {
    return this.service.validateToken(token);
  }

  @Post(':token/accept')
  async accept(
    @Param('token') token: string,
    @Body() body: { name?: string; password?: string },
  ) {
    if (!body.name || !body.password) {
      throw new BadRequestException('Nome e senha obrigatórios.');
    }
    return this.service.accept({
      token,
      name: body.name,
      password: body.password,
    });
  }
}
