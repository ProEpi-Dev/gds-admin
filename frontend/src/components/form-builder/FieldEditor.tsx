import { useState } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { FormField, FieldType, ConditionOperator, FieldCondition } from '../../types/form-builder.types';

interface FieldEditorProps {
  field: FormField;
  allFields: FormField[];
  onChange: (field: FormField) => void;
  onDelete: () => void;
}

export default function FieldEditor({ field, allFields, onChange, onDelete }: FieldEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (updates: Partial<FormField>) => {
    onChange({ ...field, ...updates });
  };

  const addCondition = () => {
    const newCondition = {
      fieldId: '',
      operator: 'equals' as ConditionOperator,
      value: '',
    };
    onChange({
      ...field,
      conditions: [...(field.conditions || []), newCondition],
    });
  };

  const updateCondition = (index: number, updates: Partial<FieldCondition>) => {
    const conditions = [...(field.conditions || [])];
    conditions[index] = { ...conditions[index], ...updates };
    onChange({ ...field, conditions });
  };

  const removeCondition = (index: number) => {
    const conditions = field.conditions?.filter((_, i) => i !== index) || [];
    onChange({ ...field, conditions });
  };

  const availableFields = allFields.filter((f) => f.id !== field.id);

  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {field.label || 'Campo sem nome'}
          </Typography>
          <Chip label={field.type} size="small" />
          {field.required && <Chip label="Obrigatório" size="small" color="primary" />}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label="Nome do Campo (ID)"
            value={field.name}
            onChange={(e) => handleChange({ name: e.target.value })}
            fullWidth
            required
            size="small"
            helperText="Usado internamente, deve ser único"
          />

          <TextField
            label="Rótulo"
            value={field.label}
            onChange={(e) => handleChange({ label: e.target.value })}
            fullWidth
            required
            size="small"
          />

          <FormControl fullWidth size="small">
            <InputLabel>Tipo</InputLabel>
            <Select
              value={field.type}
              label="Tipo"
              onChange={(e) => handleChange({ type: e.target.value as FieldType })}
            >
              <MenuItem value="text">Texto</MenuItem>
              <MenuItem value="number">Numérico</MenuItem>
              <MenuItem value="boolean">Booleano</MenuItem>
              <MenuItem value="date">Data</MenuItem>
              <MenuItem value="select">Dropdown (Escolha Única)</MenuItem>
              <MenuItem value="multiselect">Dropdown (Múltiplas Escolhas)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Placeholder"
            value={field.placeholder || ''}
            onChange={(e) => handleChange({ placeholder: e.target.value })}
            fullWidth
            size="small"
          />

          <FormControlLabel
            control={
              <Switch
                checked={field.required || false}
                onChange={(e) => handleChange({ required: e.target.checked })}
              />
            }
            label="Campo obrigatório"
          />

          {/* Opções para select e multiselect */}
          {(field.type === 'select' || field.type === 'multiselect') && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Opções
              </Typography>
              {field.options?.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    label="Rótulo"
                    value={option.label}
                    onChange={(e) => {
                      const options = [...(field.options || [])];
                      options[index] = { ...option, label: e.target.value };
                      handleChange({ options });
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Valor"
                    value={option.value}
                    onChange={(e) => {
                      const options = [...(field.options || [])];
                      options[index] = {
                        ...option,
                        value: field.type === 'select' ? e.target.value : Number(e.target.value) || e.target.value,
                      };
                      handleChange({ options });
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => {
                      const options = field.options?.filter((_, i) => i !== index) || [];
                      handleChange({ options });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  const options = [...(field.options || []), { label: '', value: '' }];
                  handleChange({ options });
                }}
                size="small"
              >
                Adicionar Opção
              </Button>
            </Box>
          )}

          {/* Validações para number */}
          {field.type === 'number' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Valor Mínimo"
                type="number"
                value={field.min ?? ''}
                onChange={(e) => handleChange({ min: e.target.value ? Number(e.target.value) : undefined })}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Valor Máximo"
                type="number"
                value={field.max ?? ''}
                onChange={(e) => handleChange({ max: e.target.value ? Number(e.target.value) : undefined })}
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
          )}

          {/* Validações para text */}
          {field.type === 'text' && (
            <TextField
              label="Tamanho Máximo"
              type="number"
              value={field.maxLength ?? ''}
              onChange={(e) => handleChange({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
              size="small"
            />
          )}

          {/* Validações para date */}
          {field.type === 'date' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Data Mínima"
                type="date"
                value={field.minDate || ''}
                onChange={(e) => handleChange({ minDate: e.target.value || undefined })}
                size="small"
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Data Máxima"
                type="date"
                value={field.maxDate || ''}
                onChange={(e) => handleChange({ maxDate: e.target.value || undefined })}
                size="small"
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}

          {/* Condições de exibição */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Exibir quando:</Typography>
              <Button startIcon={<AddIcon />} onClick={addCondition} size="small">
                Adicionar Condição
              </Button>
            </Box>
            {field.conditions?.map((condition, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Campo</InputLabel>
                  <Select
                    value={condition.fieldId}
                    label="Campo"
                    onChange={(e) => updateCondition(index, { fieldId: e.target.value })}
                  >
                    {availableFields.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Operador</InputLabel>
                  <Select
                    value={condition.operator}
                    label="Operador"
                    onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
                  >
                    <MenuItem value="equals">Igual a</MenuItem>
                    <MenuItem value="notEquals">Diferente de</MenuItem>
                    <MenuItem value="contains">Contém</MenuItem>
                    <MenuItem value="greaterThan">Maior que</MenuItem>
                    <MenuItem value="lessThan">Menor que</MenuItem>
                    <MenuItem value="isEmpty">Está vazio</MenuItem>
                    <MenuItem value="isNotEmpty">Não está vazio</MenuItem>
                  </Select>
                </FormControl>
                {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
                  <TextField
                    label="Valor"
                    value={condition.value ?? ''}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                )}
                <IconButton size="small" onClick={() => removeCondition(index)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            {(!field.conditions || field.conditions.length === 0) && (
              <Typography variant="caption" color="text.secondary">
                Sem condições - campo sempre visível
              </Typography>
            )}
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

