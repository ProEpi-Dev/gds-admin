import { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import FormBuilder from '../../../components/form-builder/FormBuilder';
import type { FormBuilderDefinition } from '../../../types/form-builder.types';

export default function FormBuilderPage() {
  const [definition, setDefinition] = useState<FormBuilderDefinition>({
    fields: [],
    title: '',
    description: '',
  });

  const handleDefinitionChange = (newDefinition: FormBuilderDefinition) => {
    setDefinition(newDefinition);
  };

  const handleSave = () => {
    console.log('Definition to save:', definition);
    alert('Definition JSON:\n' + JSON.stringify(definition, null, 2));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Construtor de Formulários</Typography>
        <Button variant="contained" onClick={handleSave}>
          Salvar Definição
        </Button>
      </Box>

      <FormBuilder definition={definition} onChange={handleDefinitionChange} />

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          JSON da Definição
        </Typography>
        <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '400px' }}>
          {JSON.stringify(definition, null, 2)}
        </pre>
      </Paper>
    </Box>
  );
}

