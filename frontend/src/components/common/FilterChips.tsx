import { Box, Chip } from "@mui/material";

interface FilterChip {
  label: string;
  value?: string | number | boolean;
  onDelete?: () => void;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onClearAll?: () => void;
}

export default function FilterChips({ filters }: FilterChipsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        alignItems: "center",
        mb: 2,
      }}
    >
      {filters.map((filter, index) => (
        <Chip
          key={index}
          label={
            filter.value !== undefined && filter.value !== null
              ? `${filter.label}: ${filter.value}`
              : filter.label
          }
          onDelete={filter.onDelete}
          size="small"
        />
      ))}
    </Box>
  );
}
