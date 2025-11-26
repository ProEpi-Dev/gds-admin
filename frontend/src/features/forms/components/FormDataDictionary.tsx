import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import type { FormBuilderDefinition, FormField } from '../../../types/form-builder.types';

interface FormDataDictionaryProps {
  definition: FormBuilderDefinition;
}

export default function FormDataDictionary({ definition }: FormDataDictionaryProps) {
  const { t } = useTranslation();

  const getFieldTypeLabel = (type: string): string => {
    return t(`forms.fieldTypes.${type}`, type);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      return value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ');
    }
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getFieldValidations = (field: FormField): string[] => {
    const validations: string[] = [];

    if (field.required) {
      validations.push('Obrigatório');
    }

    if (field.type === 'number') {
      if (field.min !== undefined) {
        validations.push(`Mínimo: ${field.min}`);
      }
      if (field.max !== undefined) {
        validations.push(`Máximo: ${field.max}`);
      }
    }

    if (field.type === 'text') {
      if (field.maxLength !== undefined) {
        validations.push(`Máximo de caracteres: ${field.maxLength}`);
      }
      if (field.validation?.pattern) {
        validations.push(`Padrão: ${field.validation.pattern}`);
      }
    }

    if (field.type === 'date') {
      if (field.minDate) {
        validations.push(`Data mínima: ${new Date(field.minDate).toLocaleDateString('pt-BR')}`);
      }
      if (field.maxDate) {
        validations.push(`Data máxima: ${new Date(field.maxDate).toLocaleDateString('pt-BR')}`);
      }
    }

    if (field.validation?.message) {
      validations.push(`Mensagem de erro: ${field.validation.message}`);
    }

    return validations;
  };

  const getFieldOptions = (field: FormField): string => {
    if ((field.type === 'select' || field.type === 'multiselect') && field.options) {
      return field.options.map((opt) => `${opt.label} (${opt.value})`).join(', ');
    }
    return '-';
  };

  const getFieldConditions = (field: FormField): string => {
    if (!field.conditions || field.conditions.length === 0) {
      return '-';
    }

    return field.conditions
      .map((cond) => {
        const operatorLabels: Record<string, string> = {
          equals: 'igual a',
          notEquals: 'diferente de',
          contains: 'contém',
          greaterThan: 'maior que',
          lessThan: 'menor que',
          isEmpty: 'está vazio',
          isNotEmpty: 'não está vazio',
        };

        const operatorLabel = operatorLabels[cond.operator] || cond.operator;
        return `Campo "${cond.fieldId}" ${operatorLabel} ${formatValue(cond.value)}`;
      })
      .join('; ');
  };

  if (!definition.fields || definition.fields.length === 0) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Nenhum campo definido no formulário.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Dicionário de Dados
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Documentação completa dos campos do formulário
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Label</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Obrigatório</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Placeholder</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Valor Padrão</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Opções</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Validações</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Condições de Exibição</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {definition.fields.map((field, index) => (
              <TableRow key={field.id || index}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {field.name}
                  </Typography>
                </TableCell>
                <TableCell>{field.label || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 250 }}>
                    {field.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={getFieldTypeLabel(field.type)} size="small" />
                </TableCell>
                <TableCell>
                  {field.required ? (
                    <Chip label="Sim" size="small" color="primary" />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Não
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{field.placeholder || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatValue(field.defaultValue)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, fontSize: '0.75rem' }}>
                    {getFieldOptions(field)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    {getFieldValidations(field).length > 0 ? (
                      getFieldValidations(field).map((validation, idx) => (
                        <Typography key={idx} variant="caption" display="block">
                          {validation}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 250, fontSize: '0.75rem' }}>
                    {getFieldConditions(field)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {definition.title && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Título do Formulário:
          </Typography>
          <Typography variant="body1">{definition.title}</Typography>
        </Box>
      )}

      {definition.description && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Descrição do Formulário:
          </Typography>
          <Typography variant="body1">{definition.description}</Typography>
        </Box>
      )}
    </Box>
  );
}

