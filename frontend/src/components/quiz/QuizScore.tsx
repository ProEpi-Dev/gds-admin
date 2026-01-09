import { Box, Typography, LinearProgress } from '@mui/material';
import type { QuizSubmission } from '../../types/quiz-submission.types';

interface QuizScoreProps {
  submission: QuizSubmission;
  showDetails?: boolean;
  passingScore?: number | null;
}

export default function QuizScore({
  submission,
  showDetails = true,
  passingScore,
}: QuizScoreProps) {
  const percentage = submission.percentage ?? 0;
  const isPassed = submission.isPassed ?? false;

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Resultado do Quiz
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Pontuação
          </Typography>
          <Typography
            variant="h6"
            color={isPassed ? 'success.main' : 'text.primary'}
            sx={{ fontWeight: 500 }}
          >
            {percentage.toFixed(2)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percentage}
          sx={{ height: 6, borderRadius: 3 }}
          color={isPassed ? 'success' : 'primary'}
        />
      </Box>

      {passingScore !== null && passingScore !== undefined && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {isPassed ? (
              <>
                ✓ Pontuação mínima atingida ({passingScore.toFixed(1)}%)
              </>
            ) : (
              <>
                Pontuação mínima: {passingScore.toFixed(1)}% (não atingida)
              </>
            )}
          </Typography>
        </Box>
      )}

      {showDetails && (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
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
    </Box>
  );
}

