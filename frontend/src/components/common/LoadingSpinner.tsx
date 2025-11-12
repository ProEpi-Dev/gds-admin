import { Box, CircularProgress } from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ size = 40, fullScreen = false }: LoadingSpinnerProps) {
  const content = (
    <CircularProgress size={size} />
  );

  if (fullScreen) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        {content}
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      p={3}
    >
      {content}
    </Box>
  );
}

