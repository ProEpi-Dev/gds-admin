import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  PlayCircle as PlayCircleIcon,
  Article as ArticleIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import { ProgressStatus } from '../../types/track-progress.types';
import type { SequenceProgress } from '../../types/track-progress.types';

interface SequenceProgressCardProps {
  sequence: any; // Sequence com dados básicos
  progress?: SequenceProgress;
  isLocked?: boolean;
  onStart?: () => void;
}

export default function SequenceProgressCard({
  sequence,
  progress,
  isLocked = false,
  onStart,
}: SequenceProgressCardProps) {
  const isContent = !!sequence.content_id;
  const isQuiz = !!sequence.form_id;
  
  const getStatusIcon = () => {
    if (isLocked) {
      return <LockIcon color="disabled" />;
    }
    
    if (!progress || progress.status === ProgressStatus.NOT_STARTED) {
      return <PlayCircleIcon color="action" />;
    }
    
    if (progress.status === ProgressStatus.COMPLETED) {
      return <CheckCircleIcon color="success" />;
    }
    
    return <PlayCircleIcon color="primary" />;
  };

  const getStatusColor = () => {
    if (isLocked) return 'default';
    if (!progress || progress.status === ProgressStatus.NOT_STARTED) return 'default';
    if (progress.status === ProgressStatus.COMPLETED) return 'success';
    return 'primary';
  };

  return (
    <Card
      sx={{
        opacity: isLocked ? 0.6 : 1,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        '&:hover': {
          boxShadow: isLocked ? undefined : 3,
        },
      }}
      onClick={() => !isLocked && onStart?.()}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                {isContent && (
                  <Tooltip title="Conteúdo">
                    <ArticleIcon fontSize="small" color="action" />
                  </Tooltip>
                )}
                {isQuiz && (
                  <Tooltip title="Quiz">
                    <QuizIcon fontSize="small" color="action" />
                  </Tooltip>
                )}
                <Typography variant="subtitle1" fontWeight="medium">
                  Sequência #{sequence.order + 1}
                </Typography>
              </Stack>
            </Box>
            <IconButton size="small" disabled={isLocked}>
              {getStatusIcon()}
            </IconButton>
          </Stack>

          {/* Status e métricas */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {progress && (
              <>
                <Chip
                  label={
                    progress.status === ProgressStatus.NOT_STARTED
                      ? 'Não iniciado'
                      : progress.status === ProgressStatus.IN_PROGRESS
                      ? 'Em progresso'
                      : 'Concluído'
                  }
                  size="small"
                  color={getStatusColor()}
                />
                {progress.visits_count > 0 && (
                  <Chip
                    label={`${progress.visits_count} visita${progress.visits_count > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {progress.time_spent_seconds && progress.time_spent_seconds > 0 && (
                  <Chip
                    label={`${Math.floor(progress.time_spent_seconds / 60)} min`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </>
            )}
            {isLocked && (
              <Chip
                label="Bloqueado"
                size="small"
                icon={<LockIcon />}
                color="default"
              />
            )}
          </Stack>

          {/* Datas */}
          {progress && (
            <Stack spacing={0.5}>
              {progress.started_at && (
                <Typography variant="caption" color="text.secondary">
                  Iniciado: {new Date(progress.started_at).toLocaleDateString('pt-BR')}
                </Typography>
              )}
              {progress.completed_at && (
                <Typography variant="caption" color="success.main">
                  Concluído: {new Date(progress.completed_at).toLocaleDateString('pt-BR')}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
