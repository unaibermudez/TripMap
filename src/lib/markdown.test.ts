import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '@/lib/markdown';

describe('parseMarkdown', () => {
  it('parte en párrafos por las líneas en blanco', () => {
    const paragraphs = parseMarkdown('Primero.\n\nSegundo.');

    expect(paragraphs).toEqual([
      [{ type: 'text', text: 'Primero.' }],
      [{ type: 'text', text: 'Segundo.' }],
    ]);
  });

  it('une con un espacio las líneas de un mismo párrafo', () => {
    const paragraphs = parseMarkdown('El ferry desde Tarifa\ncruza el estrecho.');

    expect(paragraphs).toEqual([[{ type: 'text', text: 'El ferry desde Tarifa cruza el estrecho.' }]]);
  });

  it('ignora las líneas en blanco de más y el espacio de los extremos', () => {
    const paragraphs = parseMarkdown('\n\n  Uno.  \n\n \n\n  Dos.\n\n');

    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toEqual([{ type: 'text', text: 'Uno.' }]);
    expect(paragraphs[1]).toEqual([{ type: 'text', text: 'Dos.' }]);
  });

  it('un cuerpo vacío no tiene párrafos', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   \n\n  ')).toEqual([]);
  });

  it('trata los saltos de Windows como los de Unix', () => {
    expect(parseMarkdown('Uno.\r\n\r\nDos.')).toHaveLength(2);
  });

  it('reconoce negrita, cursiva y enlaces', () => {
    const paragraphs = parseMarkdown(
      'El tren es **gratis** y *larguísimo*; sale de [Nuadibú](https://example.org/tren).',
    );

    expect(paragraphs[0]).toEqual([
      { type: 'text', text: 'El tren es ' },
      { type: 'strong', text: 'gratis' },
      { type: 'text', text: ' y ' },
      { type: 'em', text: 'larguísimo' },
      { type: 'text', text: '; sale de ' },
      { type: 'link', text: 'Nuadibú', href: 'https://example.org/tren' },
      { type: 'text', text: '.' },
    ]);
  });

  it('la negrita gana a la cursiva', () => {
    expect(parseMarkdown('**doble**')).toEqual([[{ type: 'strong', text: 'doble' }]]);
  });

  it('deja literal lo que no cierra', () => {
    expect(parseMarkdown('Un 2*3 y un [enlace sin destino]')).toEqual([
      [{ type: 'text', text: 'Un 2*3 y un [enlace sin destino]' }],
    ]);
  });

  it('no arrastra estado entre llamadas', () => {
    const first = parseMarkdown('**uno** y **dos**');
    const second = parseMarkdown('**uno** y **dos**');

    expect(second).toEqual(first);
  });
});
