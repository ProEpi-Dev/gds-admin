import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import type { QuizSubmission } from '../../types/quiz-submission.types';

interface QuizScoreProps {
  submission: QuizSubmission;
  showDetails?: boolean;
}

export default function QuizScore({
  submission,
  showDetails = true,
}: QuizScoreProps) {
  const score = submission.score ?? 0;
  const percentage = submission.percentage ?? 0;
  const isPassed = submission.isPassed ?? false;

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Resultado do Quiz
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography variant="body1">Pontuação</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isPassed ? (
              <CheckCircle color="success" />
            ) : (
              <Cancel color="error" />
            )}
            <Typography
              variant="h5"
              color={isPassed ? 'success.main' : 'error.main'}
            >
              {score.toFixed(2)}%
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{ height: 10, borderRadius: 5 }}
          color={isPassed ? 'success' : 'error'}
        />
      </Box>

      {showDetails && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Tentativa: {submission.attemptNumber}
          </Typography>
          {submission.completedAt && (
            <Typography variant="body2" color="text.secondary">
              Concluído em:{' '}
              {new Date(submission.completedAt).toLocaleString('pt-BR')}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}

