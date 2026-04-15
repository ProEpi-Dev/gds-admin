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

  it('ignora JSON inválido em string', () => {
    expect(extractFieldMetaFromDefinition('{ não é json')).toEqual({});
  });

  it('coleta questions no objeto raiz', () => {
    const m = extractFieldMetaFromDefinition({
      questions: [{ field: 'q1', label: 'P1', type: 'text' }],
    });
    expect(m.q1?.label).toBe('P1');
  });

  it('usa name em vez de field e label a partir de text', () => {
    const m = extractFieldMetaFromDefinition({
      fields: [
        {
          name: 'n1',
          text: 'Nome',
          type: 'select',
          options: [{ value: 'a', text: 'Opção A' }],
        },
      ],
    });
    expect(m.n1?.label).toBe('Nome');
    expect(m.n1?.options.get('a')).toBe('Opção A');
  });

  it('ignora entrada sem field/name string', () => {
    const m = extractFieldMetaFromDefinition({
      fields: [{ field: 99, text: 'x' } as unknown as Record<string, unknown>],
    });
    expect(m).toEqual({});
  });

  it('locationConfig válido é preservado', () => {
    const m = extractFieldMetaFromDefinition({
      fields: [
        {
          field: 'loc',
          label: 'Loc',
          type: 'location',
          locationConfig: {
            maxLevel: 'CITY_COUNCIL',
            countryKey: 'c_id',
            countryNameKey: 'c_name',
          },
        },
      ],
    });
    expect(m.loc?.locationConfig?.maxLevel).toBe('CITY_COUNCIL');
    expect(m.loc?.locationConfig?.countryKey).toBe('c_id');
  });

  it('opção com value objeto circular usa chave vazia no map', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const m = extractFieldMetaFromDefinition({
      fields: [
        {
          field: 'c',
          label: 'C',
          options: [{ value: circular, label: 'L' }],
        },
      ],
    });
    expect(m.c?.options.get('')).toBe('L');
  });
});
