export type FieldType = 
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect';

export type ConditionOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty';

export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value: any;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  // Para select e multiselect
  options?: Array<{ label: string; value: string | number }>;
  // Para number
  min?: number;
  max?: number;
  // Para text
  maxLength?: number;
  // Condições de exibição
  conditions?: FieldCondition[];
  // Validações customizadas
  validation?: {
    pattern?: string;
    message?: string;
  };
}

export interface FormBuilderDefinition {
  fields: FormField[];
  title?: string;
  description?: string;
}

