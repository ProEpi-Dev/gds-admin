import { useState } from 'react';
import { Box, Button, Paper, Typography, Stack } from '@mui/material';
import FormFieldRenderer from './FormFieldRenderer';
import type { FormBuilderDefinition } from '../../types/form-builder.types';

interface FormPreviewProps {
  definition: FormBuilderDefinition;
}

export default function FormPreview({ definition }: FormPreviewProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (fieldName: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    definition.fields.forEach((field) => {
      const value = values[field.name];

      if (field.required) {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.name] = `${field.label} é obrigatório`;
        }
      }

      if (field.type === 'number' && value !== null && value !== undefined && value !== '') {
        if (field.min !== undefined && Number(value) < field.min) {
          newErrors[field.name] = `Valor deve ser maior ou igual a ${field.min}`;
        }
        if (field.max !== undefined && Number(value) > field.max) {
          newErrors[field.name] = `Valor deve ser menor ou igual a ${field.max}`;
        }
      }

      if (field.type === 'text' && field.maxLength && value && value.length > field.maxLength) {
        newErrors[field.name] = `Máximo de ${field.maxLength} caracteres`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      console.log('Form values:', values);
      alert('Formulário válido! Valores: ' + JSON.stringify(values, null, 2));
    }
  };

  const handleReset = () => {
    setValues({});
    setErrors({});
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Preview do Formulário
      </Typography>

      <Stack spacing={3} sx={{ mt: 2 }}>
        {definition.fields.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            Adicione campos na aba "Editar Campos" para ver o preview
          </Typography>
        ) : (
          <>
            {definition.fields.map((field) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                value={values[field.name]}
                onChange={(value) => handleFieldChange(field.name, value)}
                allFields={definition.fields}
                allValues={values}
                errors={errors}
              />
            ))}

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="contained" onClick={handleSubmit}>
                Enviar
              </Button>
              <Button variant="outlined" onClick={handleReset}>
                Limpar
              </Button>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Valores atuais:
              </Typography>
              <pre style={{ fontSize: '0.75rem', overflow: 'auto', marginTop: '0.5rem' }}>
                {JSON.stringify(values, null, 2)}
              </pre>
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  );
}

