import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  Box,
  Typography,
} from '@mui/material';
import type { FormField } from '../../types/form-builder.types';
import type { Location } from '../../types/location.types';
import LocationPicker from '../common/LocationPicker';

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  allFields: FormField[];
  allValues: Record<string, any>;
  errors?: Record<string, string>;
  readOnly?: boolean;
  isQuiz?: boolean; // Indica se é um quiz (para renderizar select como radio)
  availableLocations?: Location[];
  participantCountryLocationId?: number | null;
}

/**
 * Normaliza valores booleanos para comparação.
 * Converte strings "true"/"false" para booleanos e vice-versa quando necessário.
 */
function normalizeBooleanValue(value: any): any {
  // Se o valor é uma string "true" ou "false", converte para booleano
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Se o valor já é um booleano, retorna como está
  if (typeof value === 'boolean') return value;
  // Para outros tipos, retorna o valor original
  return value;
}

/**
 * Normaliza valores para comparação, tratando especialmente valores booleanos.
 * Garante que comparações entre booleanos e strings "true"/"false" funcionem corretamente.
 */
function normalizeForComparison(fieldValue: any, conditionValue: any): { fieldValue: any; conditionValue: any } {
  // Se ambos são valores booleanos (ou strings que representam booleanos), normaliza ambos
  const fieldIsBooleanLike = typeof fieldValue === 'boolean' || fieldValue === 'true' || fieldValue === 'false';
  const conditionIsBooleanLike = typeof conditionValue === 'boolean' || conditionValue === 'true' || conditionValue === 'false';
  
  if (fieldIsBooleanLike && conditionIsBooleanLike) {
    return {
      fieldValue: normalizeBooleanValue(fieldValue),
      conditionValue: normalizeBooleanValue(conditionValue),
    };
  }
  
  return { fieldValue, conditionValue };
}

function resolveConditionFieldValue(
  conditionFieldId: string,
  allFields: FormField[],
  allValues: Record<string, any>,
) {
  const targetField =
    allFields.find((f) => f.id === conditionFieldId) ||
    allFields.find((f) => f.name === conditionFieldId);

  if (targetField) {
    return allValues[targetField.name];
  }

  return allValues[conditionFieldId];
}

export function shouldShowField(
  field: FormField,
  allValues: Record<string, any>,
  allFields: FormField[],
): boolean {
  if (!field.conditions || field.conditions.length === 0) {
    return true;
  }

  // Todas as condições devem ser verdadeiras (AND)
  return field.conditions.every((condition) => {
    const fieldValue = resolveConditionFieldValue(condition.fieldId, allFields, allValues);
    const conditionValue = condition.value;

    // Normaliza valores para comparação (especialmente booleanos)
    const { fieldValue: normalizedFieldValue, conditionValue: normalizedConditionValue } = 
      normalizeForComparison(fieldValue, conditionValue);

    switch (condition.operator) {
      case 'equals':
        return normalizedFieldValue === normalizedConditionValue;
      case 'notEquals':
        return normalizedFieldValue !== normalizedConditionValue;
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
  allFields,
  allValues,
  errors,
  readOnly = false,
  isQuiz = false,
  availableLocations = [],
  participantCountryLocationId = null,
}: FormFieldRendererProps) {
  if (!shouldShowField(field, allValues, allFields)) {
    return null;
  }

  const error = errors?.[field.name];
  const hasError = !!error;
  const helperText = error || field.description || undefined;

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
          helperText={helperText}
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
          helperText={helperText}
          inputProps={{ min: field.min, max: field.max }}
          disabled={readOnly}
        />
      );

    case 'boolean':
      return (
        <Box>
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
          {field.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 4.5 }}>
              {field.description}
            </Typography>
          )}
        </Box>
      );

    case 'date':
      return (
        <TextField
          label={field.label}
          name={field.name}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          fullWidth
          error={hasError}
          helperText={helperText}
          disabled={readOnly}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            min: field.minDate,
            max: field.maxDate,
          }}
        />
      );

    case 'select':
      // Se for quiz, renderizar como radio buttons
      if (isQuiz) {
        // Normalizar valor para string para comparação
        const normalizedValue = value !== null && value !== undefined ? String(value) : '';
        
        return (
          <FormControl fullWidth required={field.required} error={hasError} component="fieldset">
            <FormLabel component="legend" required={field.required}>
              {field.label}
            </FormLabel>
            {field.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {field.description}
              </Typography>
            )}
            <RadioGroup
              value={normalizedValue}
              onChange={(e) => {
                // Manter o tipo original do valor da opção
                const selectedOption = field.options?.find(
                  opt => String(opt.value) === e.target.value
                );
                onChange(selectedOption ? selectedOption.value : e.target.value);
              }}
              name={field.name}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={String(option.value)}
                  value={String(option.value)}
                  control={<Radio disabled={readOnly} />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {helperText && (
              <Box sx={{ color: hasError ? 'error.main' : 'text.secondary', fontSize: '0.75rem', mt: 0.5 }}>
                {helperText}
              </Box>
            )}
          </FormControl>
        );
      }
      
      // Caso contrário, renderizar como Select dropdown (comportamento padrão)
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
          {helperText && (
            <Box sx={{ color: hasError ? 'error.main' : 'text.secondary', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
              {helperText}
            </Box>
          )}
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
          {helperText && (
            <Box sx={{ color: hasError ? 'error.main' : 'text.secondary', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
              {helperText}
            </Box>
          )}
        </FormControl>
      );

    case 'location': {
      const locationConfig = field.locationConfig ?? {
        maxLevel: 'CITY_COUNCIL' as const,
        countryKey: 'countryLocationId',
        countryNameKey: 'countryLocationName',
        stateDistrictKey: 'stateDistrictLocationId',
        stateDistrictNameKey: 'stateDistrictLocationName',
        cityCouncilKey: 'cityCouncilLocationId',
        cityCouncilNameKey: 'cityCouncilLocationName',
      };

      const currentValue =
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};

      const countryKey = locationConfig.countryKey;
      const countryNameKey = locationConfig.countryNameKey ?? 'countryLocationName';
      const stateKey = locationConfig.stateDistrictKey ?? 'stateDistrictLocationId';
      const stateNameKey =
        locationConfig.stateDistrictNameKey ?? 'stateDistrictLocationName';
      const cityKey = locationConfig.cityCouncilKey ?? 'cityCouncilLocationId';
      const cityNameKey = locationConfig.cityCouncilNameKey ?? 'cityCouncilLocationName';

      const selectedCountryId = Number(currentValue[countryKey] ?? participantCountryLocationId ?? 0) || null;
      const selectedStateId = Number(currentValue[stateKey] ?? 0) || null;
      const selectedCityId = Number(currentValue[cityKey] ?? 0) || null;

      const countries = availableLocations.filter(
        (location) => location.orgLevel === 'COUNTRY' && location.active,
      );
      const states = availableLocations.filter(
        (location) =>
          location.orgLevel === 'STATE_DISTRICT' &&
          location.active &&
          (!!selectedCountryId
            ? isLocationDescendantOf(location, selectedCountryId)
            : true),
      );
      const cities = availableLocations.filter(
        (location) =>
          location.orgLevel === 'CITY_COUNCIL' &&
          location.active &&
          (!!selectedStateId
            ? isLocationDescendantOf(location, selectedStateId)
            : false),
      );

      const applyPatch = (patch: Record<string, unknown>) => {
        onChange({ ...currentValue, ...patch });
      };

      const findLocationNameById = (locationId: number | null): string | null => {
        if (!locationId) return null;
        const match = availableLocations.find((location) => location.id === locationId);
        return match?.name ?? null;
      };

      return (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {field.label}
            {field.required ? ' *' : ''}
          </Typography>
          {field.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {field.description}
            </Typography>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            <FormControl fullWidth required={field.required} error={hasError}>
              <InputLabel>País</InputLabel>
              <Select
                label="País"
                value={selectedCountryId ?? ''}
                disabled={readOnly}
                onChange={(e) => {
                  const nextCountryId = Number(e.target.value) || null;
                  const nextCountryName = findLocationNameById(nextCountryId);
                  applyPatch({
                    [countryKey]: nextCountryId,
                    [countryNameKey]: nextCountryName,
                    ...(locationConfig.maxLevel !== 'COUNTRY'
                      ? { [stateKey]: null, [stateNameKey]: null }
                      : {}),
                    ...(locationConfig.maxLevel === 'CITY_COUNCIL'
                      ? { [cityKey]: null, [cityNameKey]: null }
                      : {}),
                  });
                }}
              >
                {countries.map((country) => (
                  <MenuItem key={country.id} value={country.id}>
                    {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {locationConfig.maxLevel !== 'COUNTRY' && (
              <FormControl fullWidth required={field.required} error={hasError}>
                <InputLabel>Estado/Distrito</InputLabel>
                <Select
                  label="Estado/Distrito"
                  value={selectedStateId ?? ''}
                  disabled={readOnly || !selectedCountryId}
                  onChange={(e) => {
                    const nextStateId = Number(e.target.value) || null;
                    const nextStateName = findLocationNameById(nextStateId);
                    applyPatch({
                      [stateKey]: nextStateId,
                      [stateNameKey]: nextStateName,
                      ...(locationConfig.maxLevel === 'CITY_COUNCIL'
                        ? { [cityKey]: null, [cityNameKey]: null }
                        : {}),
                    });
                  }}
                >
                  {states.map((state) => (
                    <MenuItem key={state.id} value={state.id}>
                      {state.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {locationConfig.maxLevel === 'CITY_COUNCIL' && (
              <FormControl fullWidth required={field.required} error={hasError}>
                <InputLabel>Cidade/Conselho</InputLabel>
                <Select
                  label="Cidade/Conselho"
                  value={selectedCityId ?? ''}
                  disabled={readOnly || !selectedStateId}
                  onChange={(e) => {
                    const nextCityId = Number(e.target.value) || null;
                    const nextCityName = findLocationNameById(nextCityId);
                    applyPatch({
                      [cityKey]: nextCityId,
                      [cityNameKey]: nextCityName,
                    });
                  }}
                >
                  {cities.map((city) => (
                    <MenuItem key={city.id} value={city.id}>
                      {city.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {helperText && (
            <Box sx={{ color: hasError ? 'error.main' : 'text.secondary', fontSize: '0.75rem', mt: 0.5 }}>
              {helperText}
            </Box>
          )}
        </Box>
      );
    }

    case 'mapPoint': {
      const currentPoint =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof (value as any).latitude === 'number' &&
        typeof (value as any).longitude === 'number'
          ? {
              latitude: Number((value as any).latitude),
              longitude: Number((value as any).longitude),
            }
          : null;

      if (readOnly) {
        return (
          <TextField
            label={field.label}
            value={
              currentPoint
                ? `${currentPoint.latitude.toFixed(6)}, ${currentPoint.longitude.toFixed(6)}`
                : ''
            }
            fullWidth
            error={hasError}
            helperText={helperText}
            disabled
          />
        );
      }

      return (
        <LocationPicker
          value={currentPoint}
          onChange={(point) => onChange(point)}
          label={field.label}
        />
      );
    }

    default:
      return null;
  }
}

function isLocationDescendantOf(
  location: Location,
  ancestorLocationId: number,
): boolean {
  let currentParent = location.parent;
  while (currentParent) {
    if (currentParent.id === ancestorLocationId) {
      return true;
    }
    currentParent = currentParent.parent;
  }
  return false;
}

