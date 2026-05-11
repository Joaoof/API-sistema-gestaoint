import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';

interface ActorContext {
  userId: string;
  companyId: string;
  isSuperAdmin: boolean;
}

interface CreateInvitationInput {
  email: string;
  role?: string;
  companyId?: string; // super-admin pode mandar pra outra empresa
  planId?: string;
  message?: string;
  expiresInDays?: number;
}

interface AcceptInvitationInput {
  token: string;
  name: string;
  password: string;
}

const DEFAULT_EXPIRES_DAYS = 7;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async create(actor: ActorContext, input: CreateInvitationInput) {
    const email = input.email.trim().toLowerCase();
    if (!email.includes('@')) throw new BadRequestException('E-mail inválido.');

    // Quem é o tenant alvo? Super-admin pode escolher; user comum sempre é o da própria empresa.
    const targetCompanyId = actor.isSuperAdmin
      ? input.companyId ?? actor.companyId
      : actor.companyId;

    // E-mail já existe?
    const existingUser = await this.prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Já existe usuário com este e-mail.');
    }

    // Convite pendente?
    const pending = await this.prisma.invitation.findFirst({
      where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending) {
      throw new ConflictException(
        `Já existe convite pendente pra ${email}. Revogue antes de mandar outro.`,
      );
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + (input.expiresInDays ?? DEFAULT_EXPIRES_DAYS) * 86400_000,
    );

    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        role: input.role ?? 'user',
        companyId: targetCompanyId,
        planId: input.planId ?? null,
        invitedBy: actor.userId,
        token,
        message: input.message ?? null,
        expiresAt,
      },
    });

    const acceptUrl = `${process.env.PUBLIC_APP_URL ?? 'http://localhost:5173'}/aceitar-convite/${token}`;

    // Busca contexto pra montar o e-mail
    const [company, plan, inviter] = await Promise.all([
      targetCompanyId
        ? this.prisma.company.findUnique({
            where: { id: targetCompanyId },
            select: { name: true },
          })
        : Promise.resolve(null),
      input.planId
        ? this.prisma.plan.findUnique({
            where: { id: input.planId },
            select: { name: true },
          })
        : Promise.resolve(null),
      this.prisma.users.findUnique({
        where: { id: actor.userId },
        select: { name: true },
      }),
    ]);

    const emailResult = await this.email.sendInvitation({
      to: email,
      acceptUrl,
      inviterName: inviter?.name,
      companyName: company?.name,
      planName: plan?.name,
      role: input.role ?? 'user',
      message: input.message,
      expiresAt,
    });

    if (!emailResult.ok) {
      this.logger.warn(
        `Convite ${invitation.id} criado mas e-mail falhou: ${emailResult.error}. URL manual: ${acceptUrl}`,
      );
    }

    return { invitation, acceptUrl, emailSent: emailResult.ok };
  }

  async list(actor: ActorContext, args?: { status?: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' }) {
    const now = new Date();
    const where: any = actor.isSuperAdmin ? {} : { companyId: actor.companyId };

    switch (args?.status) {
      case 'PENDING':
        where.acceptedAt = null;
        where.revokedAt = null;
        where.expiresAt = { gt: now };
        break;
      case 'ACCEPTED':
        where.acceptedAt = { not: null };
        break;
      case 'REVOKED':
        where.revokedAt = { not: null };
        break;
      case 'EXPIRED':
        where.acceptedAt = null;
        where.revokedAt = null;
        where.expiresAt = { lte: now };
        break;
    }

    return this.prisma.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async revoke(actor: ActorContext, id: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Convite não encontrado.');
    if (inv.acceptedAt) throw new BadRequestException('Convite já foi aceito.');
    if (inv.revokedAt) throw new BadRequestException('Convite já foi revogado.');

    if (!actor.isSuperAdmin && inv.companyId !== actor.companyId) {
      throw new NotFoundException('Convite não encontrado.');
    }
    return this.prisma.invitation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Endpoint PÚBLICO de validação do token — sem auth.
   * Retorna info pra UI montar a tela de aceite (empresa, plano, role).
   */
  async validateToken(token: string) {
    const inv = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!inv) return { valid: false as const, reason: 'Convite não encontrado.' };
    if (inv.acceptedAt) return { valid: false as const, reason: 'Convite já foi aceito.' };
    if (inv.revokedAt) return { valid: false as const, reason: 'Convite foi revogado.' };
    if (inv.expiresAt < new Date()) {
      return { valid: false as const, reason: 'Convite expirado.' };
    }

    const [company, plan, inviter] = await Promise.all([
      inv.companyId
        ? this.prisma.company.findUnique({
            where: { id: inv.companyId },
            select: { id: true, name: true, logoUrl: true },
          })
        : Promise.resolve(null),
      inv.planId
        ? this.prisma.plan.findUnique({
            where: { id: inv.planId },
            select: { id: true, name: true, description: true },
          })
        : Promise.resolve(null),
      this.prisma.users.findUnique({
        where: { id: inv.invitedBy },
        select: { name: true, email: true },
      }),
    ]);

    return {
      valid: true as const,
      email: inv.email,
      role: inv.role,
      message: inv.message,
      company,
      plan,
      invitedBy: inviter,
      expiresAt: inv.expiresAt,
    };
  }

  /**
   * Endpoint PÚBLICO de aceite — cria User vinculado à empresa do convite.
   */
  async accept(input: AcceptInvitationInput) {
    const inv = await this.prisma.invitation.findUnique({
      where: { token: input.token },
    });
    if (!inv) throw new NotFoundException('Convite não encontrado.');
    if (inv.acceptedAt) throw new BadRequestException('Convite já foi aceito.');
    if (inv.revokedAt) throw new BadRequestException('Convite foi revogado.');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Convite expirado.');

    if (!input.password || input.password.length < 6) {
      throw new BadRequestException('Senha deve ter no mínimo 6 caracteres.');
    }
    if (!input.name?.trim()) {
      throw new BadRequestException('Nome obrigatório.');
    }

    // Se o convite não tem companyId, exige super-admin definir antes de aceitar — fora desse fluxo.
    if (!inv.companyId) {
      throw new BadRequestException(
        'Convite sem empresa vinculada — peça ao super-admin pra completar.',
      );
    }

    const hash = await argon2.hash(input.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          name: input.name.trim(),
          email: inv.email,
          password_hash: hash,
          role: inv.role,
          company_id: inv.companyId!,
          is_active: true,
        },
      });

      await tx.invitation.update({
        where: { id: inv.id },
        data: { acceptedAt: new Date(), acceptedByUserId: user.id },
      });

      // Se o convite tem planId, garante que a empresa tem esse plano vinculado
      if (inv.planId) {
        await tx.companyPlan.upsert({
          where: { company_id: inv.companyId! },
          update: { planId: inv.planId, isActive: true },
          create: {
            company_id: inv.companyId!,
            planId: inv.planId,
            isActive: true,
          },
        });
      }

      return { userId: user.id, email: user.email, name: user.name };
    });
  }
}
