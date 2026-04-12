import { ProgressStatus, type TrackProgress } from "../../../types/track-progress.types";

type ProgressLike = {
  status?: string | null;
  progress_percentage?: number | null;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function getProgressByCycleForParticipation(
  progressList: TrackProgress[],
  participationId?: number,
): Map<number, TrackProgress> {
  const map = new Map<number, TrackProgress>();
  const list =
    typeof participationId === "number"
      ? progressList.filter((item) => item.participation_id === participationId)
      : progressList;

  list.forEach((item) => {
    const existing = map.get(item.track_cycle_id);
    if (!existing) {
      map.set(item.track_cycle_id, item);
      return;
    }

    const existingTime = new Date(existing.updated_at).getTime();
    const itemTime = new Date(item.updated_at).getTime();
    if (itemTime >= existingTime) {
      map.set(item.track_cycle_id, item);
    }
  });

  return map;
}

export function getDisplayProgressPercentage(progress?: ProgressLike): number {
  if (progress?.status === ProgressStatus.COMPLETED) return 100;
  return clampPercent(Number(progress?.progress_percentage ?? 0));
}

export function getProgressStatusLabel(status?: string | null): string {
  if (status === ProgressStatus.COMPLETED) return "Concluído";
  if (status === ProgressStatus.IN_PROGRESS) return "Em progresso";
  return "Não iniciado";
}

export function getProgressStatusColor(
  status?: string | null,
): "default" | "primary" | "success" {
  if (status === ProgressStatus.COMPLETED) return "success";
  if (status === ProgressStatus.IN_PROGRESS) return "primary";
  return "default";
}
