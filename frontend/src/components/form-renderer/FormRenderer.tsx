import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { Box, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import FormFieldRenderer, {
  shouldShowField,
} from '../form-builder/FormFieldRenderer';
import type { FormBuilderDefinition } from '../../types/form-builder.types';
import { locationsService } from '../../api/services/locations.service';

export type FormRendererHandle = {
  /** Exibe mensagens de validação nos campos (após tentativa de envio inválida). */
  revealFieldErrors: () => void;
  /** Esconde erros nos campos (ex.: ao fechar um diálogo). */
  resetFieldErrors: () => void;
};

interface FormRendererProps {
  definition: FormBuilderDefinition;
  initialValues?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  readOnly?: boolean;
  isQuiz?: boolean; // Indica se é um quiz (para renderizar select como radio)
  participantCountryLocationId?: number | null;
  /** Se true, erros aparecem desde o início (ex.: preview/admin). Padrão: false. */
  showFieldErrorsInitially?: boolean;
}

const FormRenderer = forwardRef<FormRendererHandle, FormRendererProps>(
  function FormRenderer(
    {
      definition,
      initialValues = {},
      onChange,
      readOnly = false,
      isQuiz = false,
      participantCountryLocationId = null,
      showFieldErrorsInitially = false,
    },
    ref,
  ) {
    const [values, setValues] = useState<Record<string, any>>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [fieldErrorsVisible, setFieldErrorsVisible] = useState(
      showFieldErrorsInitially,
    );
    const onChangeRef = useRef(onChange);
    const prevDefinitionRef = useRef<string>('');
    const isInitializedRef = useRef(false);
    const valuesRef = useRef(values);
    const fieldErrorsVisibleRef = useRef(fieldErrorsVisible);

    const hasLocationField = definition.fields.some(
      (field) => field.type === 'location',
    );

    const { data: availableLocations = [] } = useQuery({
      queryKey: ['locations', 'form-renderer', 'all-pages'],
      queryFn: () => locationsService.findAllAllPages({ active: true }),
      enabled: hasLocationField,
      staleTime: 5 * 60 * 1000,
    });

    valuesRef.current = values;
    fieldErrorsVisibleRef.current = fieldErrorsVisible;

    useImperativeHandle(ref, () => ({
      revealFieldErrors: () => {
        setFieldErrorsVisible(true);
        fieldErrorsVisibleRef.current = true;
        const validation = runFormValidation(definition, valuesRef.current);
        setErrors(validation.errors);
      },
      resetFieldErrors: () => {
        setFieldErrorsVisible(false);
        fieldErrorsVisibleRef.current = false;
        setErrors({});
      },
    }), [definition]);

    // Atualizar ref quando onChange mudar
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Atualizar valores apenas quando a definição do formulário mudar (nova versão)
    useEffect(() => {
      const definitionKey = JSON.stringify(definition);

      if (definitionKey !== prevDefinitionRef.current) {
        const normalizedInitialValues = applyLocationDefaults(
          initialValues,
          definition,
          participantCountryLocationId,
          availableLocations,
        );
        setValues(normalizedInitialValues);
        setFieldErrorsVisible(showFieldErrorsInitially);
        fieldErrorsVisibleRef.current = showFieldErrorsInitially;
        const validation = runFormValidation(
          definition,
          normalizedInitialValues,
        );
        setErrors(showFieldErrorsInitially ? validation.errors : {});
        onChangeRef.current?.({
          ...normalizedInitialValues,
          _isValid: validation.isValid,
        });
        prevDefinitionRef.current = definitionKey;
        isInitializedRef.current = true;
      } else if (!isInitializedRef.current) {
        const normalizedInitialValues = applyLocationDefaults(
          initialValues,
          definition,
          participantCountryLocationId,
          availableLocations,
        );
        setValues(normalizedInitialValues);
        setFieldErrorsVisible(showFieldErrorsInitially);
        fieldErrorsVisibleRef.current = showFieldErrorsInitially;
        const validation = runFormValidation(
          definition,
          normalizedInitialValues,
        );
        setErrors(showFieldErrorsInitially ? validation.errors : {});
        onChangeRef.current?.({
          ...normalizedInitialValues,
          _isValid: validation.isValid,
        });
        isInitializedRef.current = true;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      definition,
      participantCountryLocationId,
      availableLocations,
      showFieldErrorsInitially,
    ]);

    useEffect(() => {
      if (!participantCountryLocationId || !hasLocationField) {
        return;
      }
      setValues((prevValues) => {
        const nextValues = applyLocationDefaults(
          prevValues,
          definition,
          participantCountryLocationId,
          availableLocations,
        );
        if (JSON.stringify(nextValues) === JSON.stringify(prevValues)) {
          return prevValues;
        }
        const validation = runFormValidation(definition, nextValues);
        if (fieldErrorsVisibleRef.current) {
          setErrors(validation.errors);
        }
        onChangeRef.current?.({ ...nextValues, _isValid: validation.isValid });
        return nextValues;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [participantCountryLocationId, hasLocationField, availableLocations]);

    const handleFieldChange = (fieldName: string, value: any) => {
      if (values[fieldName] === value) {
        return;
      }

      const newValues = { ...values, [fieldName]: value };
      setValues(newValues);

      const validation = runFormValidation(definition, newValues);
      setErrors(fieldErrorsVisibleRef.current ? validation.errors : {});

      const currentOnChange = onChangeRef.current;
      if (currentOnChange) {
        currentOnChange({ ...newValues, _isValid: validation.isValid });
      }
    };

    const visibleErrors = fieldErrorsVisible ? errors : {};

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
              errors={visibleErrors}
              readOnly={readOnly}
              isQuiz={isQuiz}
              availableLocations={availableLocations}
              participantCountryLocationId={participantCountryLocationId}
            />
          ))
        )}
      </Stack>
    );
  },
);

export default FormRenderer;

function runFormValidation(
  definition: FormBuilderDefinition,
  vals: Record<string, any>,
): { errors: Record<string, string>; isValid: boolean } {
  const newErrors: Record<string, string> = {};

  definition.fields.forEach((field) => {
    if (!shouldShowField(field, vals, definition.fields)) {
      return;
    }

    const value = vals[field.name];

    if (field.required) {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        newErrors[field.name] = `${field.label} é obrigatório`;
      }
    }

    if (field.type === 'location') {
      const locationConfig = field.locationConfig;
      const locationValue =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const missingLocationKey = getMissingLocationKey(
        field,
        locationConfig,
        locationValue,
      );
      if (field.required && missingLocationKey) {
        newErrors[field.name] = `${field.label} é obrigatório`;
      }
    }

    if (field.type === 'mapPoint' && field.required) {
      const pointValue =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const hasLatitude = typeof pointValue.latitude === 'number';
      const hasLongitude = typeof pointValue.longitude === 'number';
      if (!hasLatitude || !hasLongitude) {
        newErrors[field.name] = `${field.label} é obrigatório`;
      }
    }

    if (
      field.type === 'number' &&
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      if (field.min !== undefined && Number(value) < field.min) {
        newErrors[field.name] = `Valor deve ser maior ou igual a ${field.min}`;
      }
      if (field.max !== undefined && Number(value) > field.max) {
        newErrors[field.name] = `Valor deve ser menor ou igual a ${field.max}`;
      }
    }

    if (
      field.type === 'text' &&
      field.maxLength &&
      value &&
      value.length > field.maxLength
    ) {
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
}

function applyLocationDefaults(
  sourceValues: Record<string, any>,
  definition: FormBuilderDefinition,
  participantCountryLocationId: number | null,
  availableLocations: Array<{ id: number; name: string }>,
): Record<string, any> {
  if (!participantCountryLocationId) {
    return sourceValues;
  }

  const nextValues = { ...sourceValues };
  for (const field of definition.fields) {
    if (field.type !== 'location') continue;

    const countryKey = field.locationConfig?.countryKey ?? 'countryLocationId';
    const countryNameKey =
      field.locationConfig?.countryNameKey ?? 'countryLocationName';
    const currentValue =
      nextValues[field.name] &&
      typeof nextValues[field.name] === 'object' &&
      !Array.isArray(nextValues[field.name])
        ? { ...(nextValues[field.name] as Record<string, unknown>) }
        : {};

    if (!currentValue[countryKey]) {
      currentValue[countryKey] = participantCountryLocationId;
      const country = availableLocations.find(
        (location) => location.id === participantCountryLocationId,
      );
      if (country && !currentValue[countryNameKey]) {
        currentValue[countryNameKey] = country.name;
      }
      nextValues[field.name] = currentValue;
    }
  }

  return nextValues;
}

function getMissingLocationKey(
  field: FormBuilderDefinition['fields'][number],
  locationConfig:
    | FormBuilderDefinition['fields'][number]['locationConfig']
    | undefined,
  value: Record<string, unknown>,
): string | null {
  if (field.type !== 'location') return null;

  const config = locationConfig ?? {
    maxLevel: 'CITY_COUNCIL' as const,
    countryKey: 'countryLocationId',
    stateDistrictKey: 'stateDistrictLocationId',
    cityCouncilKey: 'cityCouncilLocationId',
  };

  if (!value[config.countryKey]) {
    return config.countryKey;
  }
  if (config.maxLevel !== 'COUNTRY' && !value[config.stateDistrictKey ?? '']) {
    return config.stateDistrictKey ?? 'stateDistrictLocationId';
  }
  if (
    config.maxLevel === 'CITY_COUNCIL' &&
    !value[config.cityCouncilKey ?? '']
  ) {
    return config.cityCouncilKey ?? 'cityCouncilLocationId';
  }

  return null;
}
