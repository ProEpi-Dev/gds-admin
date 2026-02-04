import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Article as ArticleIcon,
  Quiz as QuizIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import { useTrackProgressByParticipationAndCycle } from "../../track-progress/hooks/useTrackProgress";
import { TrackProgressService } from "../../../api/services/track-progress.service";
import { ProgressStatus } from "../../../types/track-progress.types";

interface SectionWithSequences {
  id: number;
  name: string;
  order: number;
  sequence: Array<{
    id: number;
    order: number;
    content_id?: number;
    form_id?: number;
    content?: { id: number; title: string; slug?: string };
    form?: { id: number; title: string };
  }>;
}

export default function TrackCycleProgressPage() {
  const { id: cycleIdParam, participationId: participationIdParam } =
    useParams<{
      id: string;
      participationId: string;
    }>();
  const navigate = useNavigate();
  const cycleId = cycleIdParam ? parseInt(cycleIdParam) : null;
  const participationId = participationIdParam
    ? parseInt(participationIdParam)
    : null;

  const queryClient = useQueryClient();
  const {
    data: progress,
    isLoading,
    error,
  } = useTrackProgressByParticipationAndCycle(participationId, cycleId);

  const completeContentMutation = useMutation({
    mutationFn: ({ sequenceId }: { sequenceId: number }) =>
      TrackProgressService.completeContent(progress!.id, sequenceId),
    onMutate: async ({ sequenceId }) => {
      // Cancelar queries pendentes
      await queryClient.cancelQueries({
        queryKey: ["track-progress", participationId, cycleId],
      });

      // Snapshot do valor anterior
      const previousProgress = queryClient.getQueryData([
        "track-progress",
        participationId,
        cycleId,
      ]);

      // Atualizar otimisticamente
      queryClient.setQueryData(
        ["track-progress", participationId, cycleId],
        (old: any) => {
          if (!old) return old;

          const now = new Date().toISOString();
          return {
            ...old,
            sequence_progress: old.sequence_progress.map((sp: any) =>
              sp.sequence_id === sequenceId
                ? { ...sp, status: "completed", completed_at: now }
                : sp,
            ),
          };
        },
      );

      return { previousProgress };
    },
    onError: (_err, _variables, context) => {
      // Reverter em caso de erro
      if (context?.previousProgress) {
        queryClient.setQueryData(
          ["track-progress", participationId, cycleId],
          context.previousProgress,
        );
      }
    },
    onSuccess: async () => {
      // Forçar refetch sem usar cache
      await queryClient.refetchQueries({
        queryKey: ["track-progress", participationId, cycleId],
        type: "active",
      });
    },
  });

  const sectionsOrdered = useMemo((): SectionWithSequences[] => {
    const track = progress?.track_cycle?.track as any;
    if (!track?.section) return [];
    const sections = Array.isArray(track.section) ? track.section : [];
    return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [progress]);

  const sequenceProgressMap = useMemo(() => {
    const map = new Map<
      number,
      {
        status: string;
        sequenceProgressId?: number;
        completed_at?: string;
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
    >();
    (progress?.sequence_progress ?? []).forEach((sp: any) => {
      map.set(sp.sequence_id, {
        status: sp.status,
        sequenceProgressId: sp.id,
        completed_at: sp.completed_at,
        quiz_submission: sp.quiz_submission,
      });
    });
    return map;
  }, [progress]);

  const handleMarkContentComplete = (
    _trackProgressId: number,
    sequenceId: number,
  ) => {
    completeContentMutation.mutate({ sequenceId });
  };

  if (isLoading || !progress) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorAlert
        message={error instanceof Error ? error.message : String(error)}
      />
    );
  if (!progress) return <ErrorAlert message="Progresso não encontrado" />;

  const participantName =
    progress.participation?.user?.name ??
    `Participação #${progress.participation_id}`;
  const trackName = progress.track_cycle?.track?.name ?? "Trilha";

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/admin/track-cycles/${cycleId}/students`)}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Percorrer trilha como participante
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Participante: <strong>{participantName}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Trilha: {trackName} • Ciclo: {progress.track_cycle?.name}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <LinearProgress
              variant="determinate"
              value={progress.progress_percentage ?? 0}
              sx={{ flex: 1, height: 10, borderRadius: 1 }}
            />
            <Typography fontWeight="medium">
              {(progress.progress_percentage ?? 0).toFixed(0)}%
            </Typography>
          </Stack>
        </Box>
      </Paper>

      <Alert severity="info" sx={{ mb: 2 }}>
        As sequências são liberadas em ordem. Conclua uma para desbloquear a
        próxima. Use &quot;Marcar como concluído&quot; em conteúdos ou abra o
        quiz em outra aba e conclua-o.
      </Alert>

      {sectionsOrdered.map((section) => {
        const sequences = Array.isArray(section.sequence)
          ? [...section.sequence].sort(
              (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
            )
          : [];
        return (
          <Accordion key={section.id} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="medium">{section.name}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List disablePadding>
                {sequences.map((seq: any) => {
                  const seqProgress = sequenceProgressMap.get(seq.id);
                  const status =
                    seqProgress?.status ?? ProgressStatus.NOT_STARTED;
                  const locked = progress.sequence_locked?.[seq.id] ?? false;
                  const isContent = !!seq.content_id;
                  const isQuiz = !!seq.form_id;
                  const completedAt = seqProgress?.completed_at;
                  const quizData = seqProgress?.quiz_submission?.[0];

                  // Formatar informações adicionais
                  let additionalInfo = "";

                  // Para quizzes, se tem dados de submissão, mostrar informações detalhadas
                  if (isQuiz && quizData && quizData.completed_at) {
                    const formattedDate = new Date(
                      quizData.completed_at,
                    ).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const score =
                      quizData.percentage !== null
                        ? `${Number(quizData.percentage).toFixed(1)}%`
                        : quizData.score !== null
                          ? `${Number(quizData.score).toFixed(1)} pts`
                          : "-";
                    const passed = quizData.is_passed
                      ? "Aprovado"
                      : "Reprovado";
                    additionalInfo = `${passed} • Nota: ${score} • Tentativa: ${quizData.attempt_number} • ${formattedDate}`;
                  }
                  // Para conteúdos concluídos, mostrar data de conclusão
                  else if (status === ProgressStatus.COMPLETED && completedAt) {
                    const formattedDate = new Date(completedAt).toLocaleString(
                      "pt-BR",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    );
                    additionalInfo = `Concluído em ${formattedDate}`;
                  }
                  // Estados padrão
                  else if (locked) {
                    additionalInfo =
                      "Conclua a sequência anterior para desbloquear";
                  } else if (status === ProgressStatus.IN_PROGRESS) {
                    additionalInfo = "Em progresso";
                  } else {
                    additionalInfo = "Não iniciado";
                  }

                  return (
                    <ListItem
                      key={seq.id}
                      sx={{
                        opacity: locked ? 0.7 : 1,
                        borderLeft: 2,
                        borderColor:
                          status === ProgressStatus.COMPLETED
                            ? "success.main"
                            : status === ProgressStatus.IN_PROGRESS
                              ? "primary.main"
                              : "divider",
                        mb: 1,
                      }}
                    >
                      <Box sx={{ mr: 1 }}>
                        {locked ? (
                          <LockIcon color="disabled" fontSize="small" />
                        ) : status === ProgressStatus.COMPLETED ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : isContent ? (
                          <ArticleIcon color="action" fontSize="small" />
                        ) : (
                          <QuizIcon color="action" fontSize="small" />
                        )}
                      </Box>
                      <ListItemText
                        primary={
                          isContent
                            ? (seq.content?.title ??
                              `Conteúdo #${seq.content_id}`)
                            : (seq.form?.title ?? `Quiz #${seq.form_id}`)
                        }
                        secondary={additionalInfo}
                      />
                      <ListItemSecondaryAction>
                        {locked ? (
                          <Chip
                            label="Bloqueado"
                            size="small"
                            icon={<LockIcon />}
                          />
                        ) : (
                          <Stack direction="row" spacing={1}>
                            {isContent && (
                              <>
                                <Button
                                  size="small"
                                  href={`/contents/${seq.content_id}/edit`}
                                  target="_blank"
                                  rel="noopener"
                                  startIcon={<OpenInNewIcon />}
                                >
                                  Abrir conteúdo
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  disabled={
                                    status === ProgressStatus.COMPLETED ||
                                    completeContentMutation.isPending
                                  }
                                  onClick={() =>
                                    handleMarkContentComplete(
                                      progress.id,
                                      seq.id,
                                    )
                                  }
                                >
                                  {status === ProgressStatus.COMPLETED
                                    ? "Concluído"
                                    : completeContentMutation.isPending
                                      ? "Salvando..."
                                      : "Marcar como concluído"}
                                </Button>
                              </>
                            )}
                            {isQuiz && (
                              <Button
                                size="small"
                                component="a"
                                href={`/admin/track-cycles/${cycleId}/participation/${progress.participation_id}/quiz/${seq.id}`}
                                startIcon={<OpenInNewIcon />}
                              >
                                Abrir quiz
                              </Button>
                            )}
                          </Stack>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
