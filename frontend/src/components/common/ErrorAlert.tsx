import { Alert, AlertTitle } from '@mui/material';

interface ErrorAlertProps {
  title?: string;
  message: string | string[];
  onClose?: () => void;
}

export default function ErrorAlert({ title, message, onClose }: ErrorAlertProps) {
  const messages = Array.isArray(message) ? message : [message];

  return (
    <Alert severity="error" onClose={onClose} sx={{ mb: 2 }}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {messages.map((msg, index) => (
        <div key={index}>{msg}</div>
      ))}
    </Alert>
  );
}

