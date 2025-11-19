import { useState, useEffect, useRef } from 'react';
import { Box, Stack } from '@mui/material';
import FormFieldRenderer from '../form-builder/FormFieldRenderer';
import type { FormBuilderDefinition } from '../../types/form-builder.types';

interface FormRendererProps {
  definition: FormBuilderDefinition;
  initialValues?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  readOnly?: boolean;
}

export default function FormRenderer({
  definition,
  initialValues = {},
  onChange,
  readOnly = false,
}: FormRendererProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const onChangeRef = useRef(onChange);
  const prevDefinitionRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  // Atualizar ref quando onChange mudar
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Atualizar valores apenas quando a definição do formulário mudar (nova versão)
  useEffect(() => {
    const definitionKey = JSON.stringify(definition);
    
    if (definitionKey !== prevDefinitionRef.current) {
      // Definição mudou, resetar valores
      setValues(initialValues);
      setErrors({});
      prevDefinitionRef.current = definitionKey;
      isInitializedRef.current = true;
    } else if (!isInitializedRef.current) {
      // Primeira renderização
      setValues(initialValues);
      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition]);

  const validate = (vals: Record<string, any>): { errors: Record<string, string>; isValid: boolean } => {
    const newErrors: Record<string, string> = {};

    definition.fields.forEach((field) => {
      const value = vals[field.name];

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

      if (field.type === 'date' && value) {
        if (field.minDate && value < field.minDate) {
          newErrors[field.name] = `Data deve ser maior ou igual a ${new Date(field.minDate).toLocaleDateString('pt-BR')}`;
        }
        if (field.maxDate && value > field.maxDate) {
          newErrors[field.name] = `Data deve ser menor ou igual a ${new Date(field.maxDate).toLocaleDateString('pt-BR')}`;
        }
      }
    });

    return { errors: newErrors, isValid: Object.keys(newErrors).length === 0 };
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    // Verificar se o valor realmente mudou
    if (values[fieldName] === value) {
      return;
    }
    
    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Validar e notificar mudanças
    const validation = validate(newValues);
    setErrors(validation.errors);
    
    // Notificar mudanças (usando ref para evitar dependências)
    const currentOnChange = onChangeRef.current;
    if (currentOnChange) {
      currentOnChange({ ...newValues, _isValid: validation.isValid });
    }
  };

  return (
    <Stack spacing={3}>
      {definition.fields.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
          Nenhum campo definido neste formulário
        </Box>
      ) : (
        definition.fields.map((field) => (
          <FormFieldRenderer
            key={field.id}
            field={field}
            value={values[field.name]}
            onChange={(value) => handleFieldChange(field.name, value)}
            allFields={definition.fields}
            allValues={values}
            errors={errors}
            readOnly={readOnly}
          />
        ))
      )}
    </Stack>
  );
}

