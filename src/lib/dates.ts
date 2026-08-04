const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Las fechas del viaje son días de calendario, no instantes: se parten a mano
 * en vez de pasarlas por `Date`, que las interpretaría en UTC y las mostraría
 * corridas un día en cualquier huso al oeste de Greenwich.
 */
function parseIsoDate(iso: string): DateParts {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`"${iso}" no es una fecha ISO de la forma YYYY-MM-DD.`);
  }
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}

function monthName(month: number): string {
  const name = MONTHS[month - 1];
  if (name === undefined) throw new Error(`El mes ${month} no existe.`);
  return name;
}

function dayAndMonth({ day, month }: DateParts): string {
  return `${day} ${monthName(month)}`;
}

function fullDate(parts: DateParts): string {
  return `${dayAndMonth(parts)} ${parts.year}`;
}

/** "10 ene": para etiquetas donde el año ya lo dice el contexto. */
export function formatShortDay(iso: string): string {
  return dayAndMonth(parseIsoDate(iso));
}

/**
 * Rango de fechas sin repetir lo que ya se ha dicho: "10–14 ene 2023",
 * "27 ene – 2 feb 2023", "10 ene 2023 – 5 abr 2024". Sin `end`, o con el mismo
 * día en los dos extremos, es una fecha suelta.
 */
export function formatDateRange(start: string, end?: string): string {
  const from = parseIsoDate(start);
  if (end === undefined || end === start) return fullDate(from);

  const to = parseIsoDate(end);
  if (from.year !== to.year) return `${fullDate(from)} – ${fullDate(to)}`;
  if (from.month !== to.month) return `${dayAndMonth(from)} – ${fullDate(to)}`;
  return `${from.day}–${to.day} ${monthName(to.month)} ${to.year}`;
}
