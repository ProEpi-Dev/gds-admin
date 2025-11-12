import { useQuery } from '@tanstack/react-query';
import { FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { formsService } from '../../api/services/forms.service';
import LoadingSpinner from './LoadingSpinner';

interface SelectFormVersionProps {
  value?: number | null;
  onChange: (formVersionId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
}

export default function SelectFormVersion({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Versão do Formulário',
}: SelectFormVersionProps) {
  const { data: formsWithVersions, isLoading } = useQuery({
    queryKey: ['forms-with-versions'],
    queryFn: () => formsService.findFormsWithLatestVersions(),
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
          <em>Selecione uma versão</em>
        </MenuItem>
        {formsWithVersions?.map((item) => (
          <MenuItem key={item.version.id} value={item.version.id}>
            {item.formTitle} - Versão {item.version.versionNumber}
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

