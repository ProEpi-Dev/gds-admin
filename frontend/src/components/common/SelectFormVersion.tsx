import { useQuery } from '@tanstack/react-query';
import { FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { formsService } from '../../api/services/forms.service';
import LoadingSpinner from './LoadingSpinner';

interface SelectFormVersionProps {
  value?: number | null;
  onChange: (id: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
  /** Filtra por contexto; quando informado, só lista formulários desse contexto */
  contextId?: number | null;
  /** Ex.: correlacionar com `form_version_id` em reports / classificação sindrômica */
  showVersionDatabaseId?: boolean;
  /**
   * `versionId` (padrão): valor = id da versão (uso em reports).
   * `formId`: valor = id do formulário — uma config cobre todas as versões do mesmo form.
   */
  valueSource?: 'versionId' | 'formId';
}

export default function SelectFormVersion({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'Versão do Formulário',
  contextId,
  showVersionDatabaseId = false,
  valueSource = 'versionId',
}: SelectFormVersionProps) {
  const { data: formsWithVersions, isLoading } = useQuery({
    queryKey: ['forms-with-versions', contextId ?? 'all'],
    queryFn: () => formsService.findFormsWithLatestVersions(contextId ?? undefined),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <FormControl fullWidth required={required} error={error}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        label={label}
      >
        <MenuItem value="">
          <em>
            {valueSource === 'formId' ? 'Selecione um formulário' : 'Selecione uma versão'}
          </em>
        </MenuItem>
        {formsWithVersions?.map((item) => {
          const optionValue =
            valueSource === 'formId' ? item.formId : item.version.id;
          return (
            <MenuItem key={`${valueSource}-${optionValue}`} value={optionValue}>
              {item.formTitle} - Versão {item.version.versionNumber}
              {showVersionDatabaseId
                ? valueSource === 'formId'
                  ? ` (form #${item.formId})`
                  : ` (#${item.version.id})`
                : ''}
            </MenuItem>
          );
        })}
      </Select>
      {helperText && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
}

