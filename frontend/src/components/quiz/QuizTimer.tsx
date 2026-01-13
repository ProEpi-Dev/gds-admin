import { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Alert } from '@mui/material';
import { Timer as TimerIcon } from '@mui/icons-material';

interface QuizTimerProps {
  timeLimitMinutes: number;
  startedAt: Date;
  onTimeUp?: () => void;
  autoSubmit?: boolean;
}

export default function QuizTimer({
  timeLimitMinutes,
  startedAt,
  onTimeUp,
}: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(
    timeLimitMinutes * 60,
  );
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (new Date().getTime() - startedAt.getTime()) / 1000,
      );
      const remaining = timeLimitMinutes * 60 - elapsed;

      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsTimeUp(true);
        if (onTimeUp) {
          onTimeUp();
        }
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimitMinutes, startedAt, onTimeUp]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const percentage = (timeRemaining / (timeLimitMinutes * 60)) * 100;

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  if (isTimeUp) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Tempo esgotado! O quiz será submetido automaticamente.
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
        }}
      >
        <TimerIcon color={percentage < 20 ? 'error' : 'primary'} />
        <Typography
          variant="h6"
          color={percentage < 20 ? 'error.main' : 'text.primary'}
        >
          {formatTime(minutes, seconds)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{ height: 8, borderRadius: 4 }}
        color={percentage < 20 ? 'error' : percentage < 50 ? 'warning' : 'primary'}
      />
      {percentage < 20 && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
          Tempo restante crítico!
        </Typography>
      )}
    </Box>
  );
}

