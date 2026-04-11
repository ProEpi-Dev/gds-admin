export const TrackCycleStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  CLOSED: "closed",
  ARCHIVED: "archived",
} as const;

export type TrackCycleStatus =
  (typeof TrackCycleStatus)[keyof typeof TrackCycleStatus];

export interface TrackCycleSequenceSummary {
  id: number;
  order: number;
  content_id?: number | null;
  form_id?: number | null;
  content?: { id: number; title: string };
  form?: { id: number; title: string };
}

export interface TrackCycleSectionSummary {
  id: number;
  name: string;
  order: number;
  sequence?: TrackCycleSequenceSummary[];
}

export interface TrackCycleSectionScheduleRow {
  section_id: number;
  start_date: string | null;
  end_date: string | null;
}

export interface TrackCycleSequenceScheduleRow {
  sequence_id: number;
  start_date: string | null;
  end_date: string | null;
}

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
    section?: TrackCycleSectionSummary[];
  };
  context?: {
    id: number;
    name: string;
  };
  track_cycle_section_schedule?: TrackCycleSectionScheduleRow[];
  track_cycle_sequence_schedule?: TrackCycleSequenceScheduleRow[];
}

export interface SectionScheduleItem {
  sectionId: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface SequenceScheduleItem {
  sequenceId: number;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ReplaceTrackCycleSchedulesDto {
  sectionSchedules: SectionScheduleItem[];
  sequenceSchedules: SequenceScheduleItem[];
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
