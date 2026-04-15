import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../../contexts/AuthContext";
import UserLayout from "../../../components/layout/UserLayout";
import { TrackCyclesService } from "../../../api/services/track-cycles.service";
import type { TrackCycle } from "../../../types/track-cycle.types";
import { TrackProgressService } from "../../../api/services/track-progress.service";
import {
  getDisplayProgressPercentage,
  getProgressByCycleForParticipation,
  getProgressStatusColor,
  getProgressStatusLabel,
} from "../../track-progress/utils/progressDisplay";

function toDateOnly(dateIso: string): Date {
  return new Date(`${dateIso.split("T")[0]}T00:00:00`);
}

/** Meia-noite local do dia corrente (comparação inclusiva com end_date). */
function todayDateOnly(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isCycleClosed(cycle: TrackCycle): boolean {
  const end = toDateOnly(cycle.end_date);
  const today = todayDateOnly();
  return end < today || cycle.status !== "active";
}

function cycleStatusLabel(cycle: TrackCycle): string {
  if (cycle.status === "draft") return "Rascunho";
  if (cycle.status === "closed") return "Encerrado";
  if (cycle.status === "archived") return "Arquivado";
  return isCycleClosed(cycle) ? "Encerrada" : "Disponível";
}

export default function AppLearnPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const contextId = user?.participation?.context.id;
  const participationId = user?.participation?.id;

  const { data: cycles = [], isLoading, error } = useQuery({
    queryKey: ["app-learn", "cycles", contextId],
    queryFn: async () => {
      const res = await TrackCyclesService.list({ contextId });
      return res.data;
    },
    enabled: Boolean(contextId),
  });

  const { data: myProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["app-learn", "my-progress"],
    queryFn: async () => {
      const res = await TrackProgressService.getMyProgress();
      return res.data;
    },
    enabled: Boolean(contextId),
  });

  const progressByCycleId = useMemo(() => {
    return getProgressByCycleForParticipation(myProgress, participationId);
  }, [myProgress, participationId]);

  const sortedCycles = useMemo(
    () =>
      [...cycles].sort(
        (a, b) =>
          toDateOnly(b.start_date).getTime() - toDateOnly(a.start_date).getTime(),
      ),
    [cycles],
  );

  return (
    <UserLayout>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          Aprenda
        </Typography>

        {error && (
          <Alert severity="error">Não foi possível carregar as trilhas.</Alert>
        )}

        {(isLoading || progressLoading) && (
          <Paper sx={{ p: 2, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Paper>
        )}

        {!isLoading && sortedCycles.length === 0 && (
          <Alert severity="info">Nenhuma trilha encontrada para seu contexto.</Alert>
        )}

        {sortedCycles.map((cycle) => {
          const closed = isCycleClosed(cycle);
          const progress = progressByCycleId.get(cycle.id);
          const progressPercentage = getDisplayProgressPercentage(progress);
          const progressLabel = getProgressStatusLabel(progress?.status);
          const startDate = format(toDateOnly(cycle.start_date), "dd/MM/yyyy", {
            locale: ptBR,
          });
          const endDate = format(toDateOnly(cycle.end_date), "dd/MM/yyyy", {
            locale: ptBR,
          });
          return (
            <Paper key={cycle.id} sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography variant="h6">{cycle.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      size="small"
                      label={cycleStatusLabel(cycle)}
                      color={closed ? "default" : "primary"}
                    />
                    <Chip
                      size="small"
                      label={progressLabel}
                      color={getProgressStatusColor(progress?.status)}
                      variant={progress ? "filled" : "outlined"}
                    />
                  </Stack>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Trilha: {cycle.track?.name ?? "Sem trilha vinculada"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Período: {startDate} até {endDate}
                </Typography>
                <Stack spacing={0.5}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="caption" color="text.secondary">
                      Progresso
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {progressPercentage.toFixed(0)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={progressPercentage}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Stack>
                <Button
                  variant={closed ? "outlined" : "contained"}
                  onClick={() => navigate(`/app/aprenda/ciclo/${cycle.id}`)}
                >
                  Ver trilha
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </UserLayout>
  );
}

