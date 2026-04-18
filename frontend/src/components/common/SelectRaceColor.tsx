import { useQuery } from "@tanstack/react-query";
import { Autocomplete, TextField } from "@mui/material";
import { raceColorsService } from "../../api/services/race-colors.service";
import type { RaceColor } from "../../types/race-color.types";
import LoadingSpinner from "./LoadingSpinner";

interface SelectRaceColorProps {
  value?: number | null;
  onChange: (raceColorId: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  label?: string;
}

export default function SelectRaceColor({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = "Raça/Cor",
}: SelectRaceColorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["race-colors"],
    queryFn: () => raceColorsService.findAll(),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const selected = data?.find((item) => item.id === value);

  return (
    <Autocomplete
      value={selected || null}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
      options={data || []}
      getOptionLabel={(option: RaceColor) => option.name}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          required={required}
        />
      )}
      renderOption={(props, option: RaceColor) => (
        <li {...props} key={option.id}>
          {option.name}
        </li>
      )}
    />
  );
}
