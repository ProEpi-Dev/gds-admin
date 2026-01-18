import { useQuery } from '@tanstack/react-query';
import { TextField, Autocomplete } from '@mui/material';
import { contextsService } from '../../api/services/contexts.service';
import LoadingSpinner from './LoadingSpinner';
import type { Context } from '../../types/context.types';

interface SelectPublicContextProps {
  value?: number | null;
  onChange: (contextId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
}

export default function SelectPublicContext({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Contexto',
}: SelectPublicContextProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['public-contexts'],
    queryFn: () => contextsService.findAll({ 
      accessType: 'PUBLIC', 
      active: true, 
      pageSize: 100 
    }),
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
        getOptionLabel={(option: Context) => option.name}
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
        renderOption={(props, option: Context) => (
          <li {...props} key={option.id}>
            {option.name}
            {option.description && ` - ${option.description}`}
          </li>
        )}
      />
    </>
  );
}
