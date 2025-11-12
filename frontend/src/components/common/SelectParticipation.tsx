import { useQuery } from '@tanstack/react-query';
import { FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { participationsService } from '../../api/services/participations.service';
import LoadingSpinner from './LoadingSpinner';

interface SelectParticipationProps {
  value?: number | null;
  onChange: (participationId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
  activeOnly?: boolean;
}

export default function SelectParticipation({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Participação',
  activeOnly = true,
}: SelectParticipationProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['participations', { active: activeOnly ? true : undefined }],
    queryFn: () => participationsService.findAll({ active: activeOnly ? true : undefined, pageSize: 100 }),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <FormControl fullWidth required={required} error={error}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        label={label}
      >
        <MenuItem value="">
          <em>Selecione uma participação</em>
        </MenuItem>
        {data?.data.map((participation) => (
          <MenuItem key={participation.id} value={participation.id}>
            Participação #{participation.id} - Usuário #{participation.userId}
          </MenuItem>
        ))}
      </Select>
      {helperText && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
}

