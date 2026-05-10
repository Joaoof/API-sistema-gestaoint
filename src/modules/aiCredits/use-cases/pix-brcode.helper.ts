/**
 * Gera o "PIX Copia e Cola" (BR Code, padrão EMV do BCB).
 *
 * Refs:
 *  - Manual de padrões BCB:
 *    https://www.bcb.gov.br/content/estabilidadefinanceira/forumpireunioes/Anexo%20I-%20Padr%c3%b5es%20para%20iniciacao%20do%20PIX.pdf
 *  - Cada campo tem ID (2 dígitos) + tamanho (2 dígitos) + valor.
 *  - O CRC16 final é calculado sobre toda a string já com o "6304" no fim
 *    (mas SEM os 4 caracteres de CRC).
 */

interface PixArgs {
  pixKey: string; // ex: "63991021043" (telefone)
  amount: number; // valor em reais (ex: 50.00)
  txid: string; // identificador único (alfanum, max 25)
  merchantName: string; // ex: "GESTAOINT"
  merchantCity: string; // ex: "BRASILIA"
  description?: string; // opcional, vai dentro do field 26 sub 02 (max 25 chars)
}

function field(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function normalizeAscii(s: string): string {
  // PIX BR Code aceita só ASCII básico
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase();
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixBrCode(args: PixArgs): string {
  const merchantName = normalizeAscii(args.merchantName).slice(0, 25);
  const merchantCity = normalizeAscii(args.merchantCity).slice(0, 15);
  const txid = normalizeAscii(args.txid).slice(0, 25) || '***';
  const desc = args.description ? normalizeAscii(args.description).slice(0, 25) : '';

  // 26: Merchant Account Information (PIX)
  let pixMai = field('00', 'BR.GOV.BCB.PIX') + field('01', args.pixKey);
  if (desc) pixMai += field('02', desc);
  const pixField = field('26', pixMai);

  // 62: Additional Data Field — TxID
  const additional = field('05', txid);
  const additionalField = field('62', additional);

  const amountStr = args.amount.toFixed(2);

  const payload =
    field('00', '01') + // Payload Format Indicator
    pixField +
    field('52', '0000') + // Merchant Category Code
    field('53', '986') + // Currency BRL
    field('54', amountStr) +
    field('58', 'BR') +
    field('59', merchantName) +
    field('60', merchantCity) +
    additionalField +
    '6304'; // CRC field placeholder

  const crc = crc16(payload);
  return payload + crc;
}

/**
 * Gera um txid aceitável pelo PIX (alfanum, max 25 chars, sem hífens).
 */
export function makePixTxid(prefix = 'GES'): string {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}${ts}${random}`.slice(0, 25);
}
