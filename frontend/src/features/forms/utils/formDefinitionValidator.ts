import { z } from 'zod';
import type { FormBuilderDefinition, FormField } from '../../../types/form-builder.types';

const optionSchema = z.object({
  label: z.string().min(1, 'Opções precisam de um label'),
  value: z.union([z.string(), z.number()]),
});

const conditionSchema = z.object({
  fieldId: z.string().min(1, 'Condições precisam referenciar um campo'),
  operator: z.enum(['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty']),
  value: z.any().optional(),
});

const validationSchema = z
  .object({
    pattern: z.string().optional(),
    message: z.string().optional(),
  })
  .optional();

const fieldSchema = z.object({
  id: z.string().min(1, 'O campo precisa de um id'),
  type: z.enum(['text', 'number', 'boolean', 'select', 'multiselect', 'date'], {
    message: 'Tipo de campo inválido. Tipos válidos são: text, number, boolean, select, multiselect, date',
  }),
  label: z.string().min(1, 'Informe um label'),
  name: z.string().min(1, 'Informe o name'),
  description: z.string().optional(),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  options: z.array(optionSchema).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  maxLength: z.number().optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  conditions: z.array(conditionSchema).optional(),
  validation: validationSchema,
});

const formDefinitionSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    fields: z.array(fieldSchema).default([]),
  })
  .superRefine((data, ctx) => {
    // Proteção extra contra dados nulos/indefinidos
    if (!data || typeof data !== 'object') return;
    
    // Verificar se fields existe e é um array antes de processar
    // Uso de cast 'any' para evitar erros de tipagem se o TS achar que fields não existe
    const fields = (data as any).fields;
    if (!fields || !Array.isArray(fields)) {
      return; 
    }

    const ids = new Set<string>();

    fields.forEach((field: any, index: number) => {
      // Verificar se field é válido antes de processar
      if (!field || typeof field !== 'object') {
        return;
      }

      if (ids.has(field.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Já existe um campo com o id "${field.id}"`,
          path: ['fields', index, 'id'],
        });
      }
      ids.add(field.id);

      if ((field.type === 'select' || field.type === 'multiselect') && (!field.options || field.options.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Campos do tipo select/multiselect precisam de opções',
          path: ['fields', index, 'options'],
        });
      }
    });
  });

export type FormDefinitionValidationResult =
  | { valid: true; definition: FormBuilderDefinition }
  | { valid: false; errors: string[] };

export function validateFormDefinition(value: unknown): FormDefinitionValidationResult {
  try {
    const result = formDefinitionSchema.safeParse(value);

    if (!result.success) {
      const errors: string[] = [];
      
      // Tratamento defensivo para extrair erros do Zod
      // Verifica errors, issues e tenta garantir que é um array
      const zodError = result.error;
      const issues = (zodError as any).errors || (zodError as any).issues || [];
      
      if (Array.isArray(issues) && issues.length > 0) {
        issues.forEach((err: any) => {
          const path = err.path && Array.isArray(err.path) && err.path.length > 0 
            ? `Campo "${err.path.join('.')}": ` 
            : '';
          const message = err.message || 'Valor inválido';
          errors.push(`${path}${message}`);
        });
      } else if (zodError.message) {
        // Fallback para mensagem genérica se não conseguir iterar
        errors.push(zodError.message);
      } else {
        errors.push('Erro de validação desconhecido (formato inválido)');
      }

      return {
        valid: false,
        errors: errors.length > 0 ? errors : ['JSON inválido'],
      };
    }

    return { valid: true, definition: result.data as FormBuilderDefinition };
  } catch (err) {
    console.error('Erro fatal na validação:', err);
    return {
      valid: false,
      errors: [`Erro ao validar JSON: ${err instanceof Error ? err.message : 'Erro desconhecido'}`],
    };
  }
}

export function formatDefinition(definition: FormBuilderDefinition): string {
  // Garantir que todos os campos tenham 'required' explícito
  const normalizedDefinition: FormBuilderDefinition = {
    ...definition,
    fields: definition.fields.map((field) => ({
      ...field,
      required: field.required ?? false,
    })),
  };
  return JSON.stringify(normalizedDefinition, null, 2);
}

export function ensureFormDefinition(value: FormBuilderDefinition | null | undefined): FormBuilderDefinition {
  if (!value) {
    return { fields: [] };
  }

  return {
    title: value.title,
    description: value.description,
    fields: Array.isArray(value.fields)
      ? value.fields.map((field) => ({
          ...field,
          required: field.required ?? false,
        }))
      : [],
  };
}

export function mergeDefinitionChanges(current: FormBuilderDefinition, nextFields: FormField[]): FormBuilderDefinition {
  return {
    ...current,
    fields: nextFields,
  };
}

