import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Divider,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import FieldEditor from './FieldEditor';
import FormPreview from './FormPreview';
import type { FormField, FormBuilderDefinition } from '../../types/form-builder.types';

interface FormBuilderProps {
  definition?: FormBuilderDefinition;
  onChange?: (definition: FormBuilderDefinition) => void;
  readOnly?: boolean;
}

export default function FormBuilder({ definition, onChange, readOnly = false }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(definition?.fields || []);
  const [activeTab, setActiveTab] = useState(0);

  // Sincronizar campos quando a definition mudar (ex: quando os dados são carregados do backend)
  useEffect(() => {
    if (definition?.fields) {
      setFields(definition.fields);
    }
  }, [definition]);

  const handleFieldsChange = (newFields: FormField[]) => {
    setFields(newFields);
    onChange?.({ fields: newFields, title: definition?.title, description: definition?.description });
  };

  const addField = () => {
    const newField: FormField = {
      id: uuidv4(),
      type: 'text',
      label: 'Novo Campo',
      name: `field_${fields.length + 1}`,
      required: false,
    };
    handleFieldsChange([...fields, newField]);
  };

  const updateField = (index: number, updatedField: FormField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    handleFieldsChange(newFields);
  };

  const deleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    handleFieldsChange(newFields);
  };

  const getDefinition = (): FormBuilderDefinition => ({
    fields,
    title: definition?.title,
    description: definition?.description,
  });

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Construtor de Formulário
      </Typography>
      <Divider sx={{ my: 2 }} />

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="Editar Campos" />
        <Tab label="Preview" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {!readOnly && (
            <Button
              startIcon={<AddIcon />}
              onClick={addField}
              variant="contained"
              sx={{ mb: 2 }}
            >
              Adicionar Campo
            </Button>
          )}

          <Stack spacing={2}>
            {fields.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                Nenhum campo adicionado. Clique em "Adicionar Campo" para começar.
              </Typography>
            ) : (
              fields.map((field, index) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  allFields={fields}
                  onChange={(updatedField) => updateField(index, updatedField)}
                  onDelete={() => deleteField(index)}
                />
              ))
            )}
          </Stack>
        </Box>
      )}

      {activeTab === 1 && (
        <FormPreview definition={getDefinition()} />
      )}
    </Paper>
  );
}

