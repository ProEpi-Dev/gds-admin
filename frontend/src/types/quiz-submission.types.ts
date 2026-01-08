import type { PaginationQuery } from './api.types';

export interface QuestionResult {
  questionName: string;
  questionId?: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsTotal: number;
  userAnswer: any;
  correctAnswer: any;
  feedback?: string;
}

export interface QuizSubmission {
  id: number;
  participationId: number;
  formVersionId: number;
  quizResponse: any;
  questionResults: QuestionResult[] | null;
  score: number | null;
  percentage: number | null;
  isPassed: boolean | null;
  attemptNumber: number;
  timeSpentSeconds: number | null;
  startedAt: string;
  completedAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  participation?: {
    id: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
  formVersion?: {
    id: number;
    versionNumber: number;
    form?: {
      id: number;
      title: string;
      reference: string;
    };
  };
}

export interface CreateQuizSubmissionDto {
  participationId: number;
  formVersionId: number;
  quizResponse: any;
  startedAt: string;
  completedAt?: string;
  timeSpentSeconds?: number;
  active?: boolean;
}

export interface UpdateQuizSubmissionDto {
  quizResponse?: any;
  completedAt?: string;
  timeSpentSeconds?: number | null;
  active?: boolean;
}

export interface QuizSubmissionQuery extends PaginationQuery {
  participationId?: number;
  formVersionId?: number;
  formId?: number;
  active?: boolean;
  isPassed?: boolean;
  startDate?: string;
  endDate?: string;
}

