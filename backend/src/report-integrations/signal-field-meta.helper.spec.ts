import { extractFieldMetaFromDefinition } from './signal-field-meta.helper';

describe('signal-field-meta.helper', () => {
  it('retorna mapa vazio para entrada vazia', () => {
    expect(extractFieldMetaFromDefinition(null)).toEqual({});
    expect(extractFieldMetaFromDefinition(undefined)).toEqual({});
  });

  it('parse JSON string e extrai campo text', () => {
    const def = JSON.stringify({
      fields: [
        {
          name: 'a',
          text: 'A',
          type: 'text',
        },
      ],
    });
    const m = extractFieldMetaFromDefinition(def);
    expect(m.a?.label).toBe('A');
  });

  it('aceita array raiz de entradas', () => {
    const m = extractFieldMetaFromDefinition([
      { field: 'x', text: 'X', type: 'text' },
    ]);
    expect(m.x?.label).toBe('X');
  });
});
