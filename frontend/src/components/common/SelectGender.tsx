import { useQuery } from '@tanstack/react-query';
import { TextField, Autocomplete } from '@mui/material';
import { gendersService } from '../../api/services/genders.service';
import LoadingSpinner from './LoadingSpinner';
import type { Gender } from '../../types/gender.types';

interface SelectGenderProps {
  value?: number | null;
  onChange: (genderId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
}

export default function SelectGender({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Gênero',
}: SelectGenderProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['genders'],
    queryFn: () => gendersService.findAll(),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const selectedGender = data?.find((gender) => gender.id === value);

  return (
    <Autocomplete
      value={selectedGender || null}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
      options={data || []}
      getOptionLabel={(option: Gender) => option.name}
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
      renderOption={(props, option: Gender) => (
        <li {...props} key={option.id}>
          {option.name}
        </li>
      )}
    />
  );
}
