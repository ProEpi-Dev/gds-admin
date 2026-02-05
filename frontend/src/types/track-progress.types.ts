export const ProgressStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export type ProgressStatus =
  (typeof ProgressStatus)[keyof typeof ProgressStatus];

export interface SequenceProgress {
  id: number;
  track_progress_id: number;
  sequence_id: number;
  status: ProgressStatus;
  started_at?: string;
  completed_at?: string;
  time_spent_seconds?: number;
  visits_count: number;
  created_at: string;
  updated_at: string;
  sequence?: {
    id: number;
    section_id: number;
    content_id?: number;
    form_id?: number;
    order: number;
  };
  quiz_submission?: Array<{
    id: number;
    score: number | null;
    percentage: number | null;
    is_passed: boolean | null;
    attempt_number: number;
    completed_at: string | null;
    started_at: string;
  }>;
}

export interface TrackProgress {
  id: number;
  participation_id: number;
  track_cycle_id: number;
  status: ProgressStatus;
  progress_percentage: number;
  last_sequence_id?: number;
  current_section_id?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  track_cycle?: {
    id: number;
    name: string;
    track: {
      id: number;
      name: string;
      description?: string;
    };
    context: {
      id: number;
      name: string;
    };
  };
  sequence_progress?: SequenceProgress[];
  participation?: {
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  /** Mapa sequenceId -> locked (calculado no backend; locked = conclua a anterior primeiro) */
  sequence_locked?: Record<number, boolean>;
}

export interface StartTrackProgressDto {
  trackCycleId: number;
  participationId: number;
}

export interface UpdateSequenceProgressDto {
  status?: ProgressStatus;
  timeSpentSeconds?: number;
}

export interface TrackProgressQueryParams {
  userId?: number;
  trackCycleId?: number;
  participationId?: number;
  status?: ProgressStatus;
}

export interface CanAccessSequenceResponse {
  canAccess: boolean;
  reason?: string;
}

/** Linha da visão de execuções (conclusões de sequências) */
export interface TrackExecutionRow {
  id: number;
  trackCycleId: number;
  trackCycleName: string;
  activityName: string;
  sequenceType: "content" | "quiz";
  participationId: number;
  participantName: string;
  completedAt: string;
}

export interface TrackExecutionsQueryParams {
  trackCycleId?: number;
  participationId?: number;
  sequenceType?: "content" | "quiz";
  activityName?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Item de conformidade de trilha obrigatória (por slug) */
export interface MandatoryComplianceItem {
  mandatorySlug: string;
  label: string;
  completed: boolean;
  trackCycleId?: number;
}

/** Resposta do endpoint de conformidade de trilhas obrigatórias */
export interface MandatoryComplianceResponse {
  items: MandatoryComplianceItem[];
  totalRequired: number;
  completedCount: number;
}
