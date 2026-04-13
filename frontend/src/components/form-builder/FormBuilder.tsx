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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import FieldEditor from './FieldEditor';
import FormPreview from './FormPreview';
import type { FormField, FormBuilderDefinition } from '../../types/form-builder.types';
import type { FormType } from '../../types/form.types';

interface FormBuilderProps {
  definition?: FormBuilderDefinition;
  onChange?: (definition: FormBuilderDefinition) => void;
  readOnly?: boolean;
  formType?: FormType;
}

export default function FormBuilder({ definition, onChange, readOnly = false, formType }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(definition?.fields || []);
  const [listPreviewFieldName, setListPreviewFieldName] = useState(
    definition?.listPreviewFieldName ?? '',
  );
  const [activeTab, setActiveTab] = useState(0);

  // Sincronizar campos quando a definition mudar (ex: quando os dados são carregados do backend)
  useEffect(() => {
    if (definition?.fields) {
      setFields(definition.fields);
    }
  }, [definition]);

  useEffect(() => {
    setListPreviewFieldName(definition?.listPreviewFieldName ?? '');
  }, [definition?.listPreviewFieldName]);

  const composeDefinition = (
    newFields: FormField[],
    previewField: string,
  ): FormBuilderDefinition => ({
    fields: newFields,
    title: definition?.title,
    description: definition?.description,
    ...(formType === 'signal'
      ? { listPreviewFieldName: previewField.trim() || undefined }
      : {}),
  });

  const handleFieldsChange = (newFields: FormField[]) => {
    let preview = listPreviewFieldName;
    if (
      formType === 'signal' &&
      preview &&
      !newFields.some((f) => f.name === preview)
    ) {
      preview = '';
      setListPreviewFieldName('');
    }
    setFields(newFields);
    onChange?.(composeDefinition(newFields, preview));
  };

  const handleListPreviewChange = (name: string) => {
    setListPreviewFieldName(name);
    onChange?.(composeDefinition(fields, name));
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

  const getDefinition = (): FormBuilderDefinition =>
    composeDefinition(fields, listPreviewFieldName);

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
          {formType === 'signal' && (
            <FormControl
              fullWidth
              size="small"
              sx={{ mb: 2 }}
              disabled={readOnly}
            >
              <InputLabel id="signal-list-preview-field-label">
                Campo na listagem do app (Meus sinais)
              </InputLabel>
              <Select
                labelId="signal-list-preview-field-label"
                label="Campo na listagem do app (Meus sinais)"
                value={listPreviewFieldName || ''}
                onChange={(e) =>
                  handleListPreviewChange(String(e.target.value))
                }
              >
                <MenuItem value="">
                  <em>Padrão — resumo automático (até 2 campos)</em>
                </MenuItem>
                {fields.map((f) => (
                  <MenuItem key={f.id} value={f.name}>
                    {f.label} ({f.name})
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Exibe só o valor desse campo em cada card (sem o texto da pergunta).
              </Typography>
            </FormControl>
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
                  formType={formType}
                  onChange={(updatedField) => updateField(index, updatedField)}
                  onDelete={() => deleteField(index)}
                />
              ))
            )}
          </Stack>

          {!readOnly && (
            <Button
              startIcon={<AddIcon />}
              onClick={addField}
              variant="contained"
              sx={{ mt: 2 }}
            >
              Adicionar Campo
            </Button>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <FormPreview definition={getDefinition()} />
      )}
    </Paper>
  );
}

