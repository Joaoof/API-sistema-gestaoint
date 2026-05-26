import { Injectable, Logger } from '@nestjs/common';

/**
 * Mensagem padrão exibida no e-mail de convite quando o remetente não
 * escreve uma mensagem personalizada. Pode ser sobrescrita por env
 * (DEFAULT_INVITE_MESSAGE) sem precisar mexer no código.
 */
const DEFAULT_INVITE_MESSAGE =
  process.env.DEFAULT_INVITE_MESSAGE ??
  'Estamos felizes em ter você por aqui! Para começar, é só aceitar o convite, ' +
    'criar sua senha e pronto — seu acesso ao GestãoInt já estará liberado.';

interface SendInvitationParams {
  to: string;
  acceptUrl: string;
  inviterName?: string | null;
  companyName?: string | null;
  planName?: string | null;
  role: string;
  message?: string | null;
  expiresAt: Date;
}

/**
 * Wrapper para a API do Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Configurado via env:
 *   - RESEND_API_KEY (obrigatório pra envio real, senão cai em log)
 *   - RESEND_FROM    (ex: "GestãoInt <convites@seu-dominio.com>")
 *   - PUBLIC_APP_URL (já usado pelo InvitationsService)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly from = process.env.RESEND_FROM ?? 'GestãoInt <no-reply@send.joaoof.com.br>';

  async sendInvitation(params: SendInvitationParams): Promise<{ ok: boolean; id?: string; error?: string }> {
    const subject = params.companyName
      ? `Convite para ${params.companyName} no GestãoInt`
      : 'Você foi convidado para o GestãoInt';

    const html = this.renderInvitationHtml(params);
    const text = this.renderInvitationText(params);

    if (!this.apiKey) {
      this.logger.warn(
        `RESEND_API_KEY não configurada — convite NÃO enviado por e-mail. URL: ${params.acceptUrl}`,
      );
      return { ok: false, error: 'RESEND_API_KEY ausente' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.from,
          to: [params.to],
          subject,
          html,
          text,
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const message = body?.message ?? body?.name ?? `HTTP ${res.status}`;
        this.logger.error(`Resend falhou (${res.status}): ${JSON.stringify(body)}`);
        return { ok: false, error: message };
      }

      this.logger.log(`Convite enviado pra ${params.to} (resend id: ${body?.id})`);
      return { ok: true, id: body?.id };
    } catch (err: any) {
      this.logger.error(`Erro de rede enviando convite: ${err?.message ?? err}`);
      return { ok: false, error: err?.message ?? 'erro de rede' };
    }
  }

  private renderInvitationHtml(p: SendInvitationParams): string {
    const expires = p.expiresAt.toLocaleDateString('pt-BR');
    const isSuper = p.role === 'SUPER_ADMIN';
    const accent = isSuper ? '#e11d48' : '#0f172a';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Convite GestãoInt</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:${accent};padding:28px 32px;color:#fff;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85;">${isSuper ? 'Convite Super Admin' : 'Convite GestãoInt'}</div>
          <div style="font-size:22px;font-weight:700;margin-top:4px;">Bem-vindo${p.companyName ? ' a ' + escapeHtml(p.companyName) : ' ao GestãoInt'}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;color:#0f172a;font-size:14px;line-height:1.6;">
          <p style="margin:0 0 16px;">
            ${p.inviterName ? `<strong>${escapeHtml(p.inviterName)}</strong> convidou` : 'Você foi convidado'} para acessar
            ${p.companyName ? `<strong>${escapeHtml(p.companyName)}</strong>` : 'o GestãoInt'} como
            <strong>${escapeHtml(translateRole(p.role))}</strong>${p.planName ? ` no plano <strong>${escapeHtml(p.planName)}</strong>` : ''}.
          </p>
          ${p.message?.trim()
            ? `<div style="margin:16px 0;padding:14px 16px;background:#f8fafc;border-left:3px solid ${accent};border-radius:6px;color:#475569;font-style:italic;">"${escapeHtml(p.message)}"</div>`
            : `<p style="margin:0 0 16px;color:#475569;">${escapeHtml(DEFAULT_INVITE_MESSAGE)}</p>`}
          <div style="text-align:center;margin:28px 0;">
            <a href="${p.acceptUrl}" style="display:inline-block;padding:14px 32px;background:${accent};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
              Aceitar convite
            </a>
          </div>
          <p style="margin:16px 0 0;color:#64748b;font-size:12px;">
            Ou copie e cole este link no navegador:<br>
            <a href="${p.acceptUrl}" style="color:${accent};word-break:break-all;">${p.acceptUrl}</a>
          </p>
          <p style="margin:20px 0 0;color:#94a3b8;font-size:11.5px;">
            Este convite expira em <strong>${expires}</strong>. Se você não esperava receber este e-mail, pode ignorá-lo.
          </p>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f8fafc;color:#94a3b8;font-size:11.5px;text-align:center;border-top:1px solid #e2e8f0;">
          GestãoInt — Sistema de gestão integrado
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private renderInvitationText(p: SendInvitationParams): string {
    const expires = p.expiresAt.toLocaleDateString('pt-BR');
    const lines = [
      `${p.inviterName ?? 'Alguém'} convidou você para ${p.companyName ?? 'o GestãoInt'}.`,
      `Função: ${translateRole(p.role)}${p.planName ? ` (plano ${p.planName})` : ''}`,
      '',
      p.message?.trim() ? `Mensagem: "${p.message}"\n` : `${DEFAULT_INVITE_MESSAGE}\n`,
      `Acesse: ${p.acceptUrl}`,
      '',
      `Este convite expira em ${expires}.`,
    ].filter(Boolean);
    return lines.join('\n');
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function translateRole(role: string): string {
  return {
    SUPER_ADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    USER: 'Usuário',
  }[role.toUpperCase()] ?? role;
}
