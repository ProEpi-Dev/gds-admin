import type { FormField } from './form-builder.types';

export interface QuizQuestion extends FormField {
  points?: number;
  weight?: number;
  correctAnswer?: any;
  explanation?: string;
  // Opções com feedback específico (para select/multiselect)
  options?: Array<{ 
    label: string; 
    value: string | number;
    feedback?: string;
  }>;
  // Feedback geral (usado como fallback ou para outros tipos de campo)
  feedback?: {
    correct?: string;
    incorrect?: string;
  };
}

export interface QuizDefinition {
  fields: QuizQuestion[];
  title?: string;
  description?: string;
  scoring?: {
    method?: 'weighted' | 'simple';
    totalPoints?: number;
  };
  feedback?: {
    showImmediate?: boolean;
    showFinal?: boolean;
    messages?: {
      passed?: string;
      failed?: string;
    };
  };
}

export interface FormVersionQuizMetadata {
  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  showFeedback?: boolean;
  randomizeQuestions?: boolean;
}

