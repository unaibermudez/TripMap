import { useMemo, type ReactNode } from 'react';
import { parseMarkdown, type Span } from '@/lib/markdown';

/**
 * El cuerpo de la parada como elementos de React, nunca como HTML inyectado:
 * el markdown se resuelve en `@/lib/markdown` y aquí solo se pintan los trozos.
 */
export function Markdown({ body }: { body: string }) {
  const paragraphs = useMemo(() => parseMarkdown(body), [body]);

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-neutral-700">
      {paragraphs.map((spans, index) => (
        <p key={index}>{spans.map(renderSpan)}</p>
      ))}
    </div>
  );
}

function renderSpan(span: Span, index: number): ReactNode {
  switch (span.type) {
    case 'strong':
      return (
        <strong key={index} className="font-semibold text-neutral-900">
          {span.text}
        </strong>
      );
    case 'em':
      return <em key={index}>{span.text}</em>;
    case 'link':
      return (
        <a
          key={index}
          href={span.href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-neutral-900"
        >
          {span.text}
        </a>
      );
    case 'text':
      return span.text;
  }
}
