import { useQuery } from '@tanstack/react-query';
import { Typography, TextField, Autocomplete } from '@mui/material';
import { contextsService } from '../../api/services/contexts.service';
import LoadingSpinner from './LoadingSpinner';

interface SelectContextProps {
  value?: number | null;
  onChange: (contextId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
  activeOnly?: boolean;
}

export default function SelectContext({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Contexto',
  activeOnly = true,
}: SelectContextProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['contexts', { active: activeOnly ? true : undefined, pageSize: 100 }],
    queryFn: () => contextsService.findAll({ active: activeOnly ? true : undefined, pageSize: 100 }),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const selectedContext = data?.data.find((context) => context.id === value);

  return (
    <>
      <Autocomplete
        value={selectedContext || null}
        onChange={(_, newValue) => onChange(newValue?.id || null)}
        options={data?.data || []}
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
            {option.description && ` - ${option.description}`}
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

