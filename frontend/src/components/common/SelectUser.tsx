import { useQuery } from '@tanstack/react-query';
import { Typography, TextField, Autocomplete } from '@mui/material';
import { usersService } from '../../api/services/users.service';
import LoadingSpinner from './LoadingSpinner';

interface SelectUserProps {
  value?: number | null;
  onChange: (userId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
  activeOnly?: boolean;
  /** IDs de usuários a excluir da lista (ex.: já administradores) */
  excludeIds?: number[];
}

export default function SelectUser({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Usuário',
  activeOnly = true,
  excludeIds,
}: SelectUserProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['users', { active: activeOnly ? true : undefined, pageSize: 100 }],
    queryFn: () => usersService.findAll({ active: activeOnly ? true : undefined, pageSize: 100 }),
  });

  const options = (data?.data || []).filter(
    (user) => !excludeIds?.includes(user.id),
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const selectedUser = options.find((user) => user.id === value) ?? data?.data.find((user) => user.id === value);

  return (
    <>
      <Autocomplete
        value={selectedUser || null}
        onChange={(_, newValue) => onChange(newValue?.id || null)}
        options={options}
        getOptionLabel={(option) => `${option.name} (${option.email})`}
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
            {option.name} ({option.email})
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

