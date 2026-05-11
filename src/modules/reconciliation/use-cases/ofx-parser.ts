/**
 * Parser OFX 1.x (formato SGML usado por bancos brasileiros).
 *
 * Não é um parser completo — extrai apenas o que precisamos pra conciliação:
 * período do extrato e cada transação (data, valor, tipo, memo, fitid).
 *
 * Exemplo de bloco esperado:
 *   <STMTTRN>
 *     <TRNTYPE>CREDIT</TRNTYPE>
 *     <DTPOSTED>20260501120000[-3:GMT]</DTPOSTED>
 *     <TRNAMT>150.00</TRNAMT>
 *     <FITID>123456</FITID>
 *     <MEMO>PAGAMENTO PIX</MEMO>
 *   </STMTTRN>
 */

export interface ParsedOfxTransaction {
  trnType: string;
  postedAt: Date;
  amount: number;
  fitId: string | null;
  memo: string | null;
  checkNum: string | null;
}

export interface ParsedOfx {
  rangeStart: Date;
  rangeEnd: Date;
  transactions: ParsedOfxTransaction[];
}

function tag(content: string, name: string): string | null {
  // OFX permite tag não-fechada (SGML); aceito ambas: <NAME>value</NAME> ou <NAME>value (até nova tag)
  const re = new RegExp(`<${name}>([^<\\r\\n]*)`, 'i');
  const m = content.match(re);
  return m ? m[1].trim() : null;
}

function parseOfxDate(raw: string | null): Date {
  if (!raw) return new Date(0);
  // OFX: YYYYMMDDHHMMSS[+/-tz]
  const clean = raw.replace(/\[.*?\]/g, '').trim();
  const y = +clean.slice(0, 4);
  const mo = +clean.slice(4, 6) - 1;
  const d = +clean.slice(6, 8);
  const h = +clean.slice(8, 10) || 0;
  const mi = +clean.slice(10, 12) || 0;
  const s = +clean.slice(12, 14) || 0;
  return new Date(Date.UTC(y, mo, d, h, mi, s));
}

export function parseOfx(content: string): ParsedOfx {
  const normalized = content.replace(/\r/g, '').replace(/&amp;/g, '&');

  // Período
  const dtStart = tag(normalized, 'DTSTART');
  const dtEnd = tag(normalized, 'DTEND');

  // Transações
  const txns: ParsedOfxTransaction[] = [];
  const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  while ((match = stmtRegex.exec(normalized)) !== null) {
    const block = match[1];
    txns.push({
      trnType: tag(block, 'TRNTYPE') ?? 'OTHER',
      postedAt: parseOfxDate(tag(block, 'DTPOSTED')),
      amount: parseFloat(tag(block, 'TRNAMT') ?? '0'),
      fitId: tag(block, 'FITID'),
      memo: tag(block, 'MEMO'),
      checkNum: tag(block, 'CHECKNUM'),
    });
  }

  if (txns.length === 0) {
    throw new Error(
      'Nenhuma transação encontrada no OFX. Verifique se o arquivo está no formato correto.',
    );
  }

  // Se DTSTART/DTEND não vierem, deriva do menor/maior postedAt
  const dates = txns.map((t) => t.postedAt.getTime());
  return {
    rangeStart: dtStart ? parseOfxDate(dtStart) : new Date(Math.min(...dates)),
    rangeEnd: dtEnd ? parseOfxDate(dtEnd) : new Date(Math.max(...dates)),
    transactions: txns,
  };
}
