import { Box, Chip } from '@mui/material';

interface FilterChip {
  label: string;
  value: string | number | boolean;
  onDelete?: () => void;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onClearAll?: () => void;
}

export default function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
      {filters.map((filter, index) => (
        <Chip
          key={index}
          label={`${filter.label}: ${filter.value}`}
          onDelete={filter.onDelete}
          size="small"
        />
      ))}
      {onClearAll && (
        <Chip label="Limpar todos" onDelete={onClearAll} size="small" color="default" />
      )}
    </Box>
  );
}

