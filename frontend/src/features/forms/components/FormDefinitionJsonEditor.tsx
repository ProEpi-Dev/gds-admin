import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Alert, Typography } from '@mui/material';

interface FormDefinitionJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export default function FormDefinitionJsonEditor({ value, onChange, error }: FormDefinitionJsonEditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Carregando editor de JSON...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Editor
        height="500px"
        defaultLanguage="json"
        value={value}
        onChange={(val) => onChange(val ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

