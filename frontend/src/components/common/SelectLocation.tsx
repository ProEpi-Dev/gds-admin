import { useQuery } from '@tanstack/react-query';
import { Typography, TextField, Autocomplete } from '@mui/material';
import { locationsService } from '../../api/services/locations.service';
import LoadingSpinner from './LoadingSpinner';

interface SelectLocationProps {
  value?: number | null;
  onChange: (locationId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
  activeOnly?: boolean;
  excludeId?: number; // Para evitar selecionar a própria localização como pai
}

export default function SelectLocation({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Localização',
  activeOnly = true,
  excludeId,
}: SelectLocationProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['locations', { active: activeOnly ? true : undefined, pageSize: 100 }],
    queryFn: () => locationsService.findAll({ active: activeOnly ? true : undefined, pageSize: 100 }),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Filtrar a localização atual se excludeId for fornecido
  const options = (data?.data || []).filter((location) => location.id !== excludeId);
  const selectedLocation = options.find((location) => location.id === value);

  return (
    <>
      <Autocomplete
        value={selectedLocation || null}
        onChange={(_, newValue) => onChange(newValue?.id || null)}
        options={options}
        getOptionLabel={(option) => option.name}
        loading={isLoading}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            required={required}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            {option.name}
            {option.parentId && ` (Filha de #${option.parentId})`}
          </li>
        )}
      />
      {helperText && !error && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.75 }}>
          {helperText}
        </Typography>
      )}
    </>
  );
}
