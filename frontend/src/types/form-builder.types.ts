export type FieldType = 
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'location'
  | 'mapPoint';

export type LocationOrgLevel =
  | 'COUNTRY'
  | 'STATE_DISTRICT'
  | 'CITY_COUNCIL';

export interface LocationFieldConfig {
  maxLevel: LocationOrgLevel;
  countryKey: string;
  countryNameKey?: string;
  stateDistrictKey?: string;
  stateDistrictNameKey?: string;
  cityCouncilKey?: string;
  cityCouncilNameKey?: string;
}

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
  description?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  // Para select e multiselect
  options?: Array<{ 
    label: string; 
    value: string | number;
    feedback?: string; // Feedback específico para esta opção (quando for quiz)
  }>;
  // Para number
  min?: number;
  max?: number;
  // Para text
  maxLength?: number;
  // Para date
  minDate?: string;
  maxDate?: string;
  // Para location
  locationConfig?: LocationFieldConfig;
  // Condições de exibição
  conditions?: FieldCondition[];
  // Validações customizadas
  validation?: {
    pattern?: string;
    message?: string;
  };
  // Campos específicos de Quiz
  correctAnswer?: any;
  points?: number;
  weight?: number;
  explanation?: string;
  feedback?: {
    correct?: string;
    incorrect?: string;
  };
}

export interface FormBuilderDefinition {
  fields: FormField[];
  title?: string;
  description?: string;
  /**
   * `name` do campo cujo valor aparece na listagem "Meus sinais" (app).
   * Se vazio, usa resumo automático (até 2 campos).
   */
  listPreviewFieldName?: string;
}

