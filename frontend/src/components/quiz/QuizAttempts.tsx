import { Box, Typography, Chip } from '@mui/material';
import type { QuizSubmission } from '../../types/quiz-submission.types';

interface QuizAttemptsProps {
  submissions: QuizSubmission[];
  maxAttempts: number | null | undefined;
  currentAttempt?: number;
}

export default function QuizAttempts({
  submissions,
  maxAttempts,
  currentAttempt,
}: QuizAttemptsProps) {
  const completedAttempts = submissions.filter(
    (s) => s.completedAt !== null,
  ).length;
  const remainingAttempts =
    maxAttempts !== null && maxAttempts !== undefined
      ? Math.max(0, maxAttempts - completedAttempts)
      : null;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Tentativas:
        </Typography>
        <Chip
          label={`${completedAttempts} de ${
            maxAttempts ?? '∞'
          } completadas`}
          size="small"
          color={remainingAttempts === 0 ? 'error' : 'default'}
        />
        {currentAttempt && (
          <Chip
            label={`Tentativa atual: ${currentAttempt}`}
            size="small"
            color="primary"
          />
        )}
      </Box>
      {remainingAttempts !== null && remainingAttempts === 0 && (
        <Typography variant="caption" color="error">
          Limite de tentativas atingido
        </Typography>
      )}
    </Box>
  );
}

