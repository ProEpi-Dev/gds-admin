import { Box, LinearProgress, Typography, Stack } from '@mui/material';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error';
  height?: number;
}

export default function ProgressBar({
  percentage,
  label,
  showPercentage = true,
  color = 'primary',
  height = 8,
}: ProgressBarProps) {
  return (
    <Stack spacing={0.5} sx={{ width: '100%' }}>
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentage, 100)}
          color={color}
          sx={{
            flex: 1,
            height,
            borderRadius: 1,
          }}
        />
        {showPercentage && (
          <Typography
            variant="body2"
            fontWeight="medium"
            sx={{ minWidth: 45, textAlign: 'right' }}
          >
            {percentage.toFixed(0)}%
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
