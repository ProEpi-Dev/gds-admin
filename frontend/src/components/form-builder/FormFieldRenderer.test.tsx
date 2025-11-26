import { describe, it, expect } from 'vitest';
import { shouldShowField } from './FormFieldRenderer';
import type { FormField } from '../../types/form-builder.types';

const buildField = (params: Partial<FormField> & Pick<FormField, 'id' | 'name' | 'type'>): FormField => ({
  label: params.label ?? params.name,
  required: params.required ?? false,
  ...params,
});

const runShouldShow = (
  field: FormField,
  allValues: Record<string, any>,
  otherFields: FormField[] = [],
) => shouldShowField(field, allValues, [field, ...otherFields]);

const checkboxField = buildField({
  id: 'checkbox-field-id',
  name: 'checkbox-field',
  type: 'boolean',
});

const checkboxField2 = buildField({
  id: 'checkbox-2-id',
  name: 'checkbox-2',
  type: 'boolean',
});

const checkboxField1 = buildField({
  id: 'checkbox-1-id',
  name: 'checkbox-1',
  type: 'boolean',
});

describe('shouldShowField', () => {
  describe('Comparação de valores booleanos', () => {
    it('deve exibir campo quando checkbox está marcado (true) e condição é "true" (string)', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: 'true', // String "true"
          },
        ],
      };

      const allValues = {
        'checkbox-field': true, // Booleano true
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(true);
    });

    it('deve exibir campo quando checkbox está desmarcado (false) e condição é "false" (string)', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: 'false', // String "false"
          },
        ],
      };

      const allValues = {
        'checkbox-field': false, // Booleano false
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(true);
    });

    it('deve ocultar campo quando checkbox está marcado (true) e condição é "false" (string)', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: 'false', // String "false"
          },
        ],
      };

      const allValues = {
        'checkbox-field': true, // Booleano true
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(false);
    });

    it('deve ocultar campo quando checkbox está desmarcado (false) e condição é "true" (string)', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: 'true', // String "true"
          },
        ],
      };

      const allValues = {
        'checkbox-field': false, // Booleano false
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(false);
    });

    it('deve exibir campo quando ambos são booleanos true', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: true, // Booleano true
          },
        ],
      };

      const allValues = {
        'checkbox-field': true, // Booleano true
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(true);
    });

    it('deve exibir campo quando ambos são booleanos false', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: false, // Booleano false
          },
        ],
      };

      const allValues = {
        'checkbox-field': false, // Booleano false
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(true);
    });

    it('deve funcionar com operador notEquals para valores booleanos', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'notEquals',
            value: 'false', // String "false"
          },
        ],
      };

      const allValues = {
        'checkbox-field': true, // Booleano true
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(true);
    });

    it('deve funcionar quando o valor do campo é string "true" e condição é booleano true', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: true, // Booleano true
          },
        ],
      };

      const allValues = {
        'checkbox-field': 'true', // String "true"
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(true);
    });

    it('deve funcionar quando o valor do campo é string "false" e condição é booleano false', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-field',
            operator: 'equals',
            value: false, // Booleano false
          },
        ],
      };

      const allValues = {
        'checkbox-field': 'false', // String "false"
      };

      expect(runShouldShow(field, allValues, [checkboxField])).toBe(true);
    });

    it('deve resolver valores quando condition.fieldId utiliza o id do campo', () => {
      const dependentField = buildField({
        id: 'uuid-checkbox-field',
        name: 'checkbox-field',
        type: 'boolean',
      });

      const field: FormField = {
        id: 'field-3',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'uuid-checkbox-field', // usa o id (UUID)
            operator: 'equals',
            value: true,
          },
        ],
      };

      const allValues = {
        'checkbox-field': true,
      };

      expect(runShouldShow(field, allValues, [dependentField])).toBe(true);
    });
  });

  describe('Comportamento geral', () => {
    it('deve exibir campo quando não há condições', () => {
      const field: FormField = {
        id: 'field-1',
        type: 'text',
        label: 'Campo Simples',
        name: 'simpleField',
      };

      const allValues = {};

      expect(runShouldShow(field, allValues)).toBe(true);
    });

    it('deve exibir campo quando há condições vazias', () => {
      const field: FormField = {
        id: 'field-1',
        type: 'text',
        label: 'Campo Simples',
        name: 'simpleField',
        conditions: [],
      };

      const allValues = {};

      expect(runShouldShow(field, allValues)).toBe(true);
    });

    it('deve funcionar com valores não booleanos (strings)', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'text-field',
            operator: 'equals',
            value: 'valor-teste',
          },
        ],
      };

      const allValues = {
        'text-field': 'valor-teste',
      };

      const dependentField = buildField({
        id: 'text-field-id',
        name: 'text-field',
        type: 'text',
      });

      expect(runShouldShow(field, allValues, [dependentField])).toBe(true);
    });

    it('deve funcionar com valores numéricos', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'number-field',
            operator: 'equals',
            value: 42,
          },
        ],
      };

      const allValues = {
        'number-field': 42,
      };

      const dependentField = buildField({
        id: 'number-field-id',
        name: 'number-field',
        type: 'number',
      });

      expect(runShouldShow(field, allValues, [dependentField])).toBe(true);
    });

    it('deve funcionar com múltiplas condições (AND)', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-1',
            operator: 'equals',
            value: 'true',
          },
          {
            fieldId: 'checkbox-2',
            operator: 'equals',
            value: 'false',
          },
        ],
      };

      const allValues = {
        'checkbox-1': true,
        'checkbox-2': false,
      };

      expect(runShouldShow(field, allValues, [checkboxField1, checkboxField2])).toBe(true);
    });

    it('deve ocultar campo quando uma das múltiplas condições falha', () => {
      const field: FormField = {
        id: 'field-2',
        type: 'text',
        label: 'Campo Condicional',
        name: 'conditionalField',
        conditions: [
          {
            fieldId: 'checkbox-1',
            operator: 'equals',
            value: 'true',
          },
          {
            fieldId: 'checkbox-2',
            operator: 'equals',
            value: 'false',
          },
        ],
      };

      const allValues = {
        'checkbox-1': true,
        'checkbox-2': true, // Deveria ser false
      };

      expect(runShouldShow(field, allValues, [checkboxField1, checkboxField2])).toBe(false);
    });
  });
});

