import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Article as ArticleIcon,
  Quiz as QuizIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTrackProgressByParticipationAndCycle } from '../../track-progress/hooks/useTrackProgress';
import { TrackProgressService } from '../../../api/services/track-progress.service';
import { ProgressStatus } from '../../../types/track-progress.types';

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
  const { id: cycleIdParam, participationId: participationIdParam } = useParams<{
    id: string;
    participationId: string;
  }>();
  const navigate = useNavigate();
  const cycleId = cycleIdParam ? parseInt(cycleIdParam) : null;
  const participationId = participationIdParam ? parseInt(participationIdParam) : null;

  const queryClient = useQueryClient();
  const { data: progress, isLoading, error } = useTrackProgressByParticipationAndCycle(
    participationId,
    cycleId,
  );

  const completeContentMutation = useMutation({
    mutationFn: ({ sequenceId }: { sequenceId: number }) =>
      TrackProgressService.completeContent(progress!.id, sequenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-progress'] });
    },
  });

  const sectionsOrdered = useMemo((): SectionWithSequences[] => {
    const track = progress?.track_cycle?.track as any;
    if (!track?.section) return [];
    const sections = Array.isArray(track.section) ? track.section : [];
    return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [progress]);

  const sequenceProgressMap = useMemo(() => {
    const map = new Map<number, { status: string; sequenceProgressId?: number }>();
    (progress?.sequence_progress ?? []).forEach((sp: any) => {
      map.set(sp.sequence_id, {
        status: sp.status,
        sequenceProgressId: sp.id,
      });
    });
    return map;
  }, [progress]);

  const handleMarkContentComplete = (_trackProgressId: number, sequenceId: number) => {
    completeContentMutation.mutate({ sequenceId });
  };

  if (isLoading || !progress) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error instanceof Error ? error.message : String(error)} />;
  if (!progress) return <ErrorAlert message="Progresso não encontrado" />;

  const participantName =
    progress.participation?.user?.name ?? `Participação #${progress.participation_id}`;
  const trackName = progress.track_cycle?.track?.name ?? 'Trilha';

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
        As sequências são liberadas em ordem. Conclua uma para desbloquear a próxima. Use
        &quot;Marcar como concluído&quot; em conteúdos ou abra o quiz em outra aba e conclua-o.
      </Alert>

      {sectionsOrdered.map((section) => {
        const sequences = Array.isArray(section.sequence)
          ? [...section.sequence].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
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
                  const status = seqProgress?.status ?? ProgressStatus.NOT_STARTED;
                  const locked = progress.sequence_locked?.[seq.id] ?? false;
                  const isContent = !!seq.content_id;
                  const isQuiz = !!seq.form_id;

                  return (
                    <ListItem
                      key={seq.id}
                      sx={{
                        opacity: locked ? 0.7 : 1,
                        borderLeft: 2,
                        borderColor:
                          status === ProgressStatus.COMPLETED
                            ? 'success.main'
                            : status === ProgressStatus.IN_PROGRESS
                            ? 'primary.main'
                            : 'divider',
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
                            ? seq.content?.title ?? `Conteúdo #${seq.content_id}`
                            : seq.form?.title ?? `Quiz #${seq.form_id}`
                        }
                        secondary={
                          locked
                            ? 'Conclua a sequência anterior para desbloquear'
                            : status === ProgressStatus.COMPLETED
                            ? 'Concluído'
                            : status === ProgressStatus.IN_PROGRESS
                            ? 'Em progresso'
                            : 'Não iniciado'
                        }
                      />
                      <ListItemSecondaryAction>
                        {locked ? (
                          <Chip label="Bloqueado" size="small" icon={<LockIcon />} />
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
                                  onClick={() => handleMarkContentComplete(progress.id, seq.id)}
                                >
                                  {status === ProgressStatus.COMPLETED
                                    ? 'Concluído'
                                    : completeContentMutation.isPending
                                    ? 'Salvando...'
                                    : 'Marcar como concluído'}
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
