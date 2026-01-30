import { useState, useMemo } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useDebounce } from '../../hooks/useDebounce';
import { useParticipations } from '../../features/participations/hooks/useParticipations';
import { useParticipation } from '../../features/participations/hooks/useParticipations';
import type { Participation } from '../../types/participation.types';

export interface SelectParticipationSearchProps {
  value: Participation | null;
  onChange: (participation: Participation | null) => void;
  /** Filtra participações por contexto (server-side) */
  contextId?: number;
  /** IDs de participações a excluir das opções (ex.: já no ciclo) */
  excludeParticipationIds?: number[];
  label?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  required?: boolean;
  error?: boolean;
  helperText?: string;
  noOptionsText?: string;
  /** Quando o valor vem só do id (ex.: filtro), passamos o id para carregar e exibir */
  valueId?: number | null;
}

export default function SelectParticipationSearch({
  value,
  onChange,
  contextId,
  excludeParticipationIds,
  label = 'Participante',
  placeholder = 'Digite para buscar no servidor...',
  size = 'small',
  required = false,
  error = false,
  helperText,
  noOptionsText = 'Nenhuma participação encontrada',
  valueId,
}: SelectParticipationSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const searchDebounced = useDebounce(inputValue, 300);

  const { data: searchResponse, isLoading } = useParticipations({
    search: searchDebounced.trim() || undefined,
    contextId,
    pageSize: 20,
    active: true,
    includeUser: true,
  });
  const { data: valueDetail } = useParticipation(valueId ?? null);

  const searchResults = searchResponse?.data ?? [];
  const displayValue = value ?? (valueId != null ? valueDetail ?? null : null);

  const options = useMemo(() => {
    const list = searchResults.filter(
      (p) => !excludeParticipationIds?.includes(p.id),
    );
    if (displayValue && !list.some((p) => p.id === displayValue.id)) {
      return [displayValue, ...list];
    }
    return list;
  }, [searchResults, excludeParticipationIds, displayValue]);

  return (
    <Autocomplete
        options={options}
        getOptionLabel={(opt: Participation) =>
          opt.userName
            ? `${opt.userName} (#${opt.id})`
            : `Participação #${opt.id}`
        }
        value={displayValue}
        onInputChange={(_, v) => setInputValue(v)}
        onChange={(_, v) => onChange(v)}
        filterOptions={(x) => x}
        loading={isLoading}
        size={size}
        noOptionsText={noOptionsText}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            size={size}
            required={required}
            error={error}
            helperText={helperText}
          />
        )}
      />
  );
}
