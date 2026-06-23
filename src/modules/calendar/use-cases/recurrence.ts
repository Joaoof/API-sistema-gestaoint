/**
 * Expansão de RRULE (RFC 5545) em um range. Suporta FREQ=DAILY|WEEKLY|MONTHLY|YEARLY,
 * INTERVAL, COUNT, UNTIL, BYDAY (MO,TU,WE,TH,FR,SA,SU), BYMONTHDAY, BYMONTH.
 *
 * Não é uma implementação 100% conforme RFC — cobre o conjunto comum usado em
 * agenda corporativa. Para casos exóticos (BYSETPOS, EXDATE em formato avançado etc.),
 * trocar por `rrule` (npm) sem mudar a assinatura.
 */

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface Parsed {
  freq: Freq;
  interval: number;
  count?: number;
  until?: Date;
  byDay?: number[]; // 0=Sun .. 6=Sat
  byMonthDay?: number[];
  byMonth?: number[]; // 1..12
}

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export function parseRRule(rule: string): Parsed | null {
  if (!rule) return null;
  const clean = rule.replace(/^RRULE:/i, '').trim();
  if (!clean) return null;

  const parts: Record<string, string> = {};
  for (const segment of clean.split(';')) {
    const [k, v] = segment.split('=');
    if (k && v) parts[k.toUpperCase()] = v.toUpperCase();
  }

  const freq = parts['FREQ'] as Freq | undefined;
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) {
    return null;
  }

  return {
    freq,
    interval: parts['INTERVAL'] ? Math.max(1, Number(parts['INTERVAL'])) : 1,
    count: parts['COUNT'] ? Number(parts['COUNT']) : undefined,
    until: parts['UNTIL'] ? parseUntil(parts['UNTIL']) : undefined,
    byDay: parts['BYDAY']
      ? parts['BYDAY']
          .split(',')
          .map((d) => DAY_MAP[d.slice(-2)])
          .filter((n) => n !== undefined)
      : undefined,
    byMonthDay: parts['BYMONTHDAY']
      ? parts['BYMONTHDAY'].split(',').map((n) => Number(n))
      : undefined,
    byMonth: parts['BYMONTH']
      ? parts['BYMONTH'].split(',').map((n) => Number(n))
      : undefined,
  };
}

function parseUntil(raw: string): Date | undefined {
  // formato: 20260630T235959Z ou 20260630
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!m) return undefined;
  return new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      m[4] ? Number(m[4]) : 0,
      m[5] ? Number(m[5]) : 0,
      m[6] ? Number(m[6]) : 0,
    ),
  );
}

/**
 * Expande uma recorrência dentro do intervalo [rangeStart, rangeEnd].
 * Retorna lista de pares { occurrenceStart, occurrenceEnd } — calcula a duração
 * do evento base e aplica em cada ocorrência.
 */
export function expandRecurrence(args: {
  start: Date;
  end: Date;
  rrule?: string | null;
  recurrenceUntil?: Date | null;
  rangeStart: Date;
  rangeEnd: Date;
  exceptions?: Set<string>;
}): Array<{ start: Date; end: Date }> {
  const baseStart = new Date(args.start);
  const baseEnd = new Date(args.end);
  const duration = baseEnd.getTime() - baseStart.getTime();

  if (!args.rrule) {
    if (baseEnd >= args.rangeStart && baseStart <= args.rangeEnd) {
      return [{ start: baseStart, end: baseEnd }];
    }
    return [];
  }

  const rule = parseRRule(args.rrule);
  if (!rule) {
    return [{ start: baseStart, end: baseEnd }];
  }

  const limitUntil = rule.until ?? args.recurrenceUntil ?? args.rangeEnd;
  const hardStop = new Date(
    Math.min(limitUntil.getTime(), args.rangeEnd.getTime()),
  );

  const out: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(baseStart);
  let produced = 0;
  // safety: limit total iterations to 5000 to avoid runaway loops
  for (let i = 0; i < 5000; i++) {
    if (cursor > hardStop) break;
    if (rule.count !== undefined && produced >= rule.count) break;

    const occEnd = new Date(cursor.getTime() + duration);
    const passesByDay =
      !rule.byDay || rule.byDay.includes(cursor.getUTCDay());
    const passesByMonthDay =
      !rule.byMonthDay || rule.byMonthDay.includes(cursor.getUTCDate());
    const passesByMonth =
      !rule.byMonth || rule.byMonth.includes(cursor.getUTCMonth() + 1);

    const occKey = cursor.toISOString();
    const inRange = occEnd >= args.rangeStart && cursor <= args.rangeEnd;
    const notExcepted = !args.exceptions?.has(occKey);

    if (passesByDay && passesByMonthDay && passesByMonth) {
      if (inRange && notExcepted) {
        out.push({ start: new Date(cursor), end: occEnd });
      }
      produced++;
    }

    cursor = advance(cursor, rule);
  }
  return out;
}

function advance(date: Date, rule: Parsed): Date {
  const next = new Date(date);
  if (rule.freq === 'DAILY') {
    next.setUTCDate(next.getUTCDate() + rule.interval);
  } else if (rule.freq === 'WEEKLY') {
    // semantically: avança 1 dia até cair em BYDAY; se BYDAY ausente, semana inteira
    if (rule.byDay && rule.byDay.length > 0) {
      next.setUTCDate(next.getUTCDate() + 1);
      // se voltou ao dia inicial da semana, pula INTERVAL-1 semanas
      const sameDow = next.getUTCDay() === date.getUTCDay();
      if (sameDow && rule.interval > 1) {
        next.setUTCDate(next.getUTCDate() + 7 * (rule.interval - 1));
      }
    } else {
      next.setUTCDate(next.getUTCDate() + 7 * rule.interval);
    }
  } else if (rule.freq === 'MONTHLY') {
    next.setUTCMonth(next.getUTCMonth() + rule.interval);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + rule.interval);
  }
  return next;
}

/**
 * Próximas N ocorrências a partir de `from`, respeitando até `maxDate`.
 * Usado pelo scheduler pra calcular quando disparar próximos reminders.
 */
export function nextOccurrencesAfter(args: {
  start: Date;
  end: Date;
  rrule?: string | null;
  recurrenceUntil?: Date | null;
  from: Date;
  maxDate: Date;
  limit?: number;
}): Array<{ start: Date; end: Date }> {
  return expandRecurrence({
    start: args.start,
    end: args.end,
    rrule: args.rrule,
    recurrenceUntil: args.recurrenceUntil,
    rangeStart: args.from,
    rangeEnd: args.maxDate,
  }).slice(0, args.limit ?? 100);
}
