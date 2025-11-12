import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
} from '@mui/material';
import type { FormField } from '../../types/form-builder.types';

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  allFields: FormField[];
  allValues: Record<string, any>;
  errors?: Record<string, string>;
  readOnly?: boolean;
}

function shouldShowField(field: FormField, allValues: Record<string, any>): boolean {
  if (!field.conditions || field.conditions.length === 0) {
    return true;
  }

  // Todas as condições devem ser verdadeiras (AND)
  return field.conditions.every((condition) => {
    const fieldValue = allValues[condition.fieldId];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'notEquals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue || '').includes(String(conditionValue || ''));
      case 'greaterThan':
        return Number(fieldValue) > Number(conditionValue);
      case 'lessThan':
        return Number(fieldValue) < Number(conditionValue);
      case 'isEmpty':
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'isNotEmpty':
        return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      default:
        return true;
    }
  });
}

export default function FormFieldRenderer({
  field,
  value,
  onChange,
  allValues,
  errors,
  readOnly = false,
}: FormFieldRendererProps) {
  if (!shouldShowField(field, allValues)) {
    return null;
  }

  const error = errors?.[field.name];
  const hasError = !!error;

  switch (field.type) {
    case 'text':
      return (
        <TextField
          label={field.label}
          name={field.name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          fullWidth
          error={hasError}
          helperText={error}
          inputProps={{ maxLength: field.maxLength }}
          disabled={readOnly}
        />
      );

    case 'number':
      return (
        <TextField
          label={field.label}
          name={field.name}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          required={field.required}
          placeholder={field.placeholder}
          fullWidth
          error={hasError}
          helperText={error}
          inputProps={{ min: field.min, max: field.max }}
          disabled={readOnly}
        />
      );

    case 'boolean':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              name={field.name}
              disabled={readOnly}
            />
          }
          label={field.label}
          required={field.required}
        />
      );

    case 'select':
      return (
        <FormControl fullWidth required={field.required} error={hasError}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            label={field.label}
            name={field.name}
            disabled={readOnly}
          >
            {field.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {error && <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>{error}</Box>}
        </FormControl>
      );

    case 'multiselect':
      return (
        <FormControl fullWidth required={field.required} error={hasError}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => onChange(e.target.value)}
            label={field.label}
            name={field.name}
            disabled={readOnly}
            renderValue={(selected) => {
              const selectedLabels = selected
                .map((val) => field.options?.find((opt) => opt.value === val)?.label)
                .filter(Boolean);
              return selectedLabels.join(', ');
            }}
          >
            {field.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={Array.isArray(value) && value.includes(option.value)} />
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {error && <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>{error}</Box>}
        </FormControl>
      );

    default:
      return null;
  }
}

