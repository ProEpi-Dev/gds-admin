export const TrackCycleStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export type TrackCycleStatus =
  (typeof TrackCycleStatus)[keyof typeof TrackCycleStatus];

export interface TrackCycle {
  id: number;
  track_id: number;
  context_id: number;
  name: string;
  description?: string;
  mandatory_slug?: string | null;
  status: TrackCycleStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  active: boolean;
  track?: {
    id: number;
    name: string;
    description?: string;
  };
  context?: {
    id: number;
    name: string;
  };
}

export interface CreateTrackCycleDto {
  trackId: number;
  contextId: number;
  name: string;
  description?: string;
  mandatorySlug?: string;
  status?: TrackCycleStatus;
  startDate: string;
  endDate: string;
}

export interface UpdateTrackCycleDto {
  name?: string;
  description?: string;
  mandatorySlug?: string;
  status?: TrackCycleStatus;
  startDate?: string;
  endDate?: string;
}

export interface UpdateTrackCycleStatusDto {
  status: TrackCycleStatus;
}

export interface TrackCycleQueryParams {
  contextId?: number;
  trackId?: number;
  status?: TrackCycleStatus;
  active?: boolean;
}

export interface StudentProgress {
  id: number;
  participation_id: number;
  track_cycle_id: number;
  status: string;
  progress_percentage: number;
  started_at: string;
  completed_at?: string;
  participation: {
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}
