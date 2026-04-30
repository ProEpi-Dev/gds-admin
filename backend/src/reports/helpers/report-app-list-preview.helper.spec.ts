import { buildAppListPreviewText } from './report-app-list-preview.helper';

describe('buildAppListPreviewText', () => {
  it('retorna texto padrão quando não há objeto de resposta', () => {
    expect(buildAppListPreviewText({}, null)).toBe('Sem detalhes adicionais.');
    expect(buildAppListPreviewText({}, undefined)).toBe(
      'Sem detalhes adicionais.',
    );
    expect(buildAppListPreviewText({}, [])).toBe('Sem detalhes adicionais.');
    expect(buildAppListPreviewText({}, 'x')).toBe('Sem detalhes adicionais.');
  });

  it('usa listPreviewFieldName com tipos de campo', () => {
    const baseDef = {
      listPreviewFieldName: 'campo',
      fields: [
        { name: 'campo', type: 'boolean' },
        {
          name: 'sel',
          type: 'select',
          options: [{ value: { id: 1 }, label: 'Um' }],
        },
        {
          name: 'multi',
          type: 'multiselect',
          options: [{ value: { id: 2 }, label: 'Dois' }],
        },
        { name: 'dt', type: 'date' },
        {
          name: 'map',
          type: 'mapPoint',
        },
        {
          name: 'loc',
          type: 'location',
          locationConfig: {
            countryNameKey: 'pais',
            stateDistrictNameKey: 'uf',
            cityCouncilNameKey: 'mun',
          },
        },
      ],
    };

    expect(
      buildAppListPreviewText(baseDef, { campo: true }),
    ).toBe('Sim');
    expect(
      buildAppListPreviewText(baseDef, { campo: false }),
    ).toBe('Não');

    expect(
      buildAppListPreviewText({ ...baseDef, listPreviewFieldName: 'sel' }, {
        sel: { id: 1 },
      }),
    ).toBe('Um');

    expect(
      buildAppListPreviewText({ ...baseDef, listPreviewFieldName: 'multi' }, {
        multi: [{ id: 2 }, 'extra'],
      }),
    ).toBe('Dois, extra');

    expect(
      buildAppListPreviewText({ ...baseDef, listPreviewFieldName: 'dt' }, {
        dt: '2024-06-01',
      }),
    ).toMatch(/\d{2}\/\d{2}\/\d{4}/);

    expect(
      buildAppListPreviewText({ ...baseDef, listPreviewFieldName: 'map' }, {
        map: { latitude: -23.5, longitude: -46.6 },
      }),
    ).toBe('-23.500000, -46.600000');

    expect(
      buildAppListPreviewText({ ...baseDef, listPreviewFieldName: 'loc' }, {
        loc: { pais: 'BR', uf: 'SP', mun: 'X' },
      }),
    ).toBe('BR · SP · X');

    expect(
      buildAppListPreviewText({ ...baseDef, listPreviewFieldName: 'loc' }, {
        loc: { outro: { nested: 1 } },
      }),
    ).toContain('outro');

    expect(
      buildAppListPreviewText(
        {
          listPreviewFieldName: 'locEmpty',
          fields: [
            {
              name: 'locEmpty',
              type: 'location',
              locationConfig: {},
            },
          ],
        },
        { locEmpty: { fallback: 'ok' } },
      ),
    ).toContain('fallback');

    expect(
      buildAppListPreviewText(
        {
          listPreviewFieldName: 'plain',
          fields: [{ name: 'plain', type: 'text' }],
        },
        { plain: BigInt(9) },
      ),
    ).toBe('9');

    expect(
      buildAppListPreviewText(
        { listPreviewFieldName: 'x', fields: [{ name: 'x', type: 'text' }] },
        { x: Symbol('sym') },
      ),
    ).toMatch(/^Symbol/);
  });

  it('retorna traço quando preview existe mas valor está vazio', () => {
    expect(
      buildAppListPreviewText(
        { listPreviewFieldName: 'campo', fields: [] },
        { campo: '' },
      ),
    ).toBe('—');
  });

  it('prioriza sintomas quando não há preview nomeado', () => {
    expect(
      buildAppListPreviewText({}, { symptoms: ['a', 'b'] }),
    ).toBe('Sintomas: a, b.');
  });

  it('junta até dois campos quando não há sintomas nem preview', () => {
    expect(
      buildAppListPreviewText(
        {
          fields: [
            {
              name: 'a',
              type: 'select',
              options: [{ value: 1, label: 'Um' }],
            },
          ],
        },
        { a: 1, b: 'livre', _isValid: true },
      ),
    ).toBe('Um · livre');
  });

  it('sem campos úteis retorna texto padrão', () => {
    expect(buildAppListPreviewText({}, { _isValid: true })).toBe(
      'Sem detalhes adicionais.',
    );
  });

  it('sem meta formata objeto plano e primitivos', () => {
    const joined = buildAppListPreviewText({}, {
      nest: { inner: 'v' },
      n: 42,
    });
    expect(joined).toContain('inner');
    expect(joined).toContain('42');

    expect(buildAppListPreviewText({}, { nest: { inner: 'v' } })).toContain(
      'inner',
    );
  });
});
