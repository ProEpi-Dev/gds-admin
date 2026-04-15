import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import UserLayout from "../../../components/layout/UserLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { TrackProgressService } from "../../../api/services/track-progress.service";
import { TrackCyclesService } from "../../../api/services/track-cycles.service";
import type { TrackCycle } from "../../../types/track-cycle.types";
import { ProgressStatus, type TrackProgress } from "../../../types/track-progress.types";

function toDateOnly(dateIso: string): Date {
  return new Date(`${dateIso.split("T")[0]}T00:00:00`);
}

function todayDateOnly(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isCycleClosed(cycle: TrackCycle): boolean {
  const end = toDateOnly(cycle.end_date);
  const today = todayDateOnly();
  return end < today || cycle.status !== "active";
}

type CycleProgressPayload = {
  progress: TrackProgress | null;
  cycle: TrackCycle;
};

type SectionLike = {
  id: number;
  name: string;
  order?: number;
  sequence?: Array<{
    id: number;
    order?: number;
    content?: { title?: string };
    form?: { title?: string };
    content_id?: number;
    form_id?: number;
  }>;
};

function formatScheduleDayBr(iso: string): string {
  const parts = iso.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusChip(status: string) {
  if (status === ProgressStatus.COMPLETED) {
    return <Chip size="small" color="success" label="Concluído" />;
  }
  if (status === ProgressStatus.IN_PROGRESS) {
    return <Chip size="small" color="warning" label="Em andamento" />;
  }
  return <Chip size="small" label="Pendente" />;
}

export default function AppLearnCyclePage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const participationId = user?.participation?.id ?? null;
  const parsedCycleId = cycleId ? Number(cycleId) : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["app-learn", "cycle-progress", participationId, parsedCycleId],
    queryFn: async (): Promise<CycleProgressPayload | null> => {
      if (!participationId || !parsedCycleId) return null;
      const cycleRes = await TrackCyclesService.get(parsedCycleId);
      const cycle = cycleRes.data;

      const ensureProgress = async (): Promise<CycleProgressPayload> => {
        await TrackProgressService.start({
          participationId,
          trackCycleId: parsedCycleId,
        });
        const created = await TrackProgressService.getByParticipationAndCycle(
          participationId,
          parsedCycleId,
        );
        return { progress: created.data, cycle };
      };

      try {
        const found = await TrackProgressService.getByParticipationAndCycle(
          participationId,
          parsedCycleId,
        );
        if (found.data) {
          return { progress: found.data, cycle };
        }
        // Sem registro de progresso: só inicia automaticamente se o ciclo ainda permitir.
        if (isCycleClosed(cycle)) {
          return { progress: null, cycle };
        }
        return ensureProgress();
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          if (isCycleClosed(cycle)) {
            return { progress: null, cycle };
          }
          return ensureProgress();
        }
        throw err;
      }
    },
    enabled: Boolean(participationId && parsedCycleId),
  });

  const progress = data?.progress ?? null;
  const cycleDetail = data?.cycle ?? null;
  const readOnlyClosedWithoutProgress = Boolean(
    cycleDetail && isCycleClosed(cycleDetail) && !progress,
  );

  const displayTitle = useMemo(
    () => progress?.track_cycle?.name ?? cycleDetail?.name ?? "Trilha",
    [progress?.track_cycle?.name, cycleDetail?.name],
  );

  const sections = useMemo(() => {
    const fromProgress = (progress?.track_cycle?.track as { section?: SectionLike[] }) ?? {};
    const fromProgressSections = Array.isArray(fromProgress.section)
      ? fromProgress.section
      : [];
    if (fromProgressSections.length > 0) {
      return [...fromProgressSections].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
    }
    const fromCycle = cycleDetail?.track?.section ?? [];
    return [...fromCycle].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [progress, cycleDetail]);

  const sequenceStatus = useMemo(() => {
    const map = new Map<number, string>();
    (progress?.sequence_progress ?? []).forEach((row) => {
      map.set(row.sequence_id, row.status);
    });
    return map;
  }, [progress]);

  const sequenceLabelById = useMemo(() => {
    const map = new Map<number, string>();
    const sections = cycleDetail?.track?.section ?? [];
    sections.forEach((section) => {
      (section.sequence ?? []).forEach((sequence) => {
        const label =
          sequence.content?.title ??
          sequence.form?.title ??
          (sequence.content_id
            ? `Conteúdo #${sequence.content_id}`
            : sequence.form_id
              ? `Quiz #${sequence.form_id}`
              : `Sequência #${sequence.id}`);
        map.set(sequence.id, label);
      });
    });
    return map;
  }, [cycleDetail?.track?.section]);

  const getScheduleInfo = (sequenceId: number, status: string) => {
    const locked = progress?.sequence_locked?.[sequenceId] ?? false;
    const orderLocked = progress?.sequence_order_locked?.[sequenceId] ?? false;
    const scheduleState = progress?.sequence_schedule_state?.[sequenceId];
    const scheduleWindow = progress?.sequence_schedule_window?.[sequenceId];
    const from = scheduleWindow?.start
      ? formatScheduleDayBr(scheduleWindow.start)
      : null;
    const to = scheduleWindow?.end ? formatScheduleDayBr(scheduleWindow.end) : null;
    const period = from && to ? `de ${from} a ${to}` : null;

    if (status === ProgressStatus.COMPLETED) {
      return { chip: statusChip(status), secondary: "Concluído" };
    }
    if (status === ProgressStatus.IN_PROGRESS && !locked) {
      return { chip: statusChip(status), secondary: "Em progresso" };
    }
    if (!locked) {
      return { chip: statusChip(status), secondary: "Não iniciado" };
    }

    if (scheduleState === "upcoming") {
      return {
        chip: <Chip size="small" color="warning" label="Em breve" />,
        secondary: period
          ? `Em breve. Ficará disponível ${period}.`
          : "Em breve — fora do período de disponibilidade deste item.",
      };
    }

    if (scheduleState === "expired") {
      return {
        chip: <Chip size="small" variant="outlined" label="Encerrado" />,
        secondary: period
          ? `Prazo encerrado. Este item esteve disponível ${period}.`
          : "Prazo de disponibilidade encerrado.",
      };
    }

    if (orderLocked) {
      return {
        chip: <Chip size="small" label="Bloqueado" />,
        secondary: "Conclua a sequência anterior para desbloquear.",
      };
    }

    return {
      chip: <Chip size="small" label="Bloqueado" />,
      secondary: "Este item está bloqueado no momento.",
    };
  };

  return (
    <UserLayout>
      <Stack spacing={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/app/aprenda")}
          sx={{ alignSelf: "flex-start" }}
        >
          Voltar
        </Button>

        {isLoading && (
          <Paper sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Paper>
        )}

        {error && (
          <Alert severity="error">
            Não foi possível carregar os detalhes desta trilha.
          </Alert>
        )}

        {!isLoading && !error && readOnlyClosedWithoutProgress && cycleDetail && (
          <Alert severity="info">
            Este ciclo já foi encerrado
            {cycleDetail.end_date
              ? ` (término em ${format(toDateOnly(cycleDetail.end_date), "dd/MM/yyyy", { locale: ptBR })}).`
              : "."}{" "}
            Como não havia progresso iniciado, os conteúdos desta trilha não podem ser
            abertos.
          </Alert>
        )}

        {!isLoading && !error && data && !progress && cycleDetail && !readOnlyClosedWithoutProgress && (
          <Alert severity="warning">
            Não encontramos progresso para esta trilha no momento.
          </Alert>
        )}

        {(progress || readOnlyClosedWithoutProgress) && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              {displayTitle}
            </Typography>
            {progress ? (
              <Typography variant="body2" color="text.secondary">
                Progresso geral: {(progress.progress_percentage ?? 0).toFixed(0)}%
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Ciclo encerrado — sem progresso registrado.
              </Typography>
            )}
          </Paper>
        )}

        {(progress || cycleDetail) && sections.length === 0 && (
          <Alert severity="info">Esta trilha ainda não possui seções ativas.</Alert>
        )}

        {sections.map((section) => (
          <Accordion key={section.id} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>{section.name}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List disablePadding>
                {(section.sequence ?? [])
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((sequence) => {
                    const fallbackLabel =
                      sequence.content?.title ??
                      sequence.form?.title ??
                      (sequence.content_id
                        ? `Conteúdo #${sequence.content_id}`
                        : sequence.form_id
                          ? `Quiz #${sequence.form_id}`
                          : `Sequência #${sequence.id}`);
                    const label =
                      sequenceLabelById.get(sequence.id) ?? fallbackLabel;
                    const status =
                      sequenceStatus.get(sequence.id) ?? ProgressStatus.NOT_STARTED;
                    const scheduleInfo = readOnlyClosedWithoutProgress
                      ? {
                          chip: (
                            <Chip
                              size="small"
                              variant="outlined"
                              label="Encerrado"
                            />
                          ),
                          secondary:
                            "Este ciclo foi encerrado antes de haver progresso iniciado.",
                        }
                      : getScheduleInfo(sequence.id, status);
                    const locked =
                      (progress?.sequence_locked?.[sequence.id] ?? false) ||
                      readOnlyClosedWithoutProgress;
                    const isContent = Boolean(sequence.content_id);
                    const isQuiz = Boolean(sequence.form_id);
                    return (
                      <ListItem key={sequence.id} divider sx={{ py: 1.5, px: 0 }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "flex-start" }}
                          justifyContent="space-between"
                          sx={{ width: "100%" }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1, pr: { sm: 2 } }}>
                            <ListItemText
                              primary={label}
                              secondary={scheduleInfo.secondary}
                              primaryTypographyProps={{
                                sx: {
                                  wordBreak: "break-word",
                                },
                              }}
                              secondaryTypographyProps={{
                                sx: {
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                },
                              }}
                            />
                          </Box>
                          <Box sx={{ flexShrink: 0, pt: { sm: 0.5 } }}>
                            {scheduleInfo.chip}
                          </Box>
                          {!locked && (
                            <Stack direction="row" spacing={1}>
                              {isContent && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<OpenInNewIcon />}
                                  onClick={() =>
                                    navigate(
                                      `/app/aprenda/ciclo/${parsedCycleId}/conteudo/${sequence.id}/${sequence.content_id}`,
                                    )
                                  }
                                >
                                  {status === ProgressStatus.COMPLETED
                                    ? "Ver conteúdo"
                                    : "Abrir conteúdo"}
                                </Button>
                              )}
                              {isQuiz && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<OpenInNewIcon />}
                                  onClick={() =>
                                    navigate(
                                      `/app/aprenda/ciclo/${parsedCycleId}/quiz/${sequence.id}`,
                                    )
                                  }
                                >
                                  Responder quiz
                                </Button>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      </ListItem>
                    );
                  })}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </UserLayout>
  );
}

