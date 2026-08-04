/** Un trozo de texto del cuerpo, ya resuelto su formato. */
export type Span =
  | { type: 'text'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'link'; text: string; href: string };

/** Un párrafo es su lista de trozos. */
export type Paragraph = Span[];

const INLINE =
  /\*\*(?<strong>[^*]+)\*\*|\*(?<em>[^*]+)\*|\[(?<text>[^\]]+)\]\((?<href>[^()\s]+)\)/g;

function parseInline(text: string): Paragraph {
  const spans: Paragraph = [];
  let consumed = 0;

  for (const match of text.matchAll(INLINE)) {
    const raw = match[0];
    if (raw === undefined) continue;

    if (match.index > consumed) {
      spans.push({ type: 'text', text: text.slice(consumed, match.index) });
    }
    consumed = match.index + raw.length;

    const { strong, em, text: linkText, href } = match.groups ?? {};
    if (strong !== undefined) spans.push({ type: 'strong', text: strong });
    else if (em !== undefined) spans.push({ type: 'em', text: em });
    else if (linkText !== undefined && href !== undefined) {
      spans.push({ type: 'link', text: linkText, href });
    }
  }

  if (consumed < text.length) spans.push({ type: 'text', text: text.slice(consumed) });
  return spans;
}

/**
 * El cuerpo de una parada partido en párrafos, listo para renderizar como
 * elementos de React. Es un subconjunto deliberado de markdown: párrafos
 * separados por una línea en blanco, con negrita, cursiva y enlaces. Cualquier
 * otra marca se queda literal.
 *
 * Los saltos de línea sueltos son plegado del texto, no salto de párrafo: las
 * líneas de un mismo párrafo se unen con un espacio.
 */
export function parseMarkdown(body: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const block of body.replace(/\r\n/g, '\n').split(/\n[ \t]*\n/)) {
    const text = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .join(' ');

    if (text !== '') paragraphs.push(parseInline(text));
  }

  return paragraphs;
}
