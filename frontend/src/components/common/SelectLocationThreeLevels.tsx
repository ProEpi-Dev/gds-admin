import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, MenuItem, TextField } from "@mui/material";
import { locationsService } from "../../api/services/locations.service";

interface SelectLocationThreeLevelsProps {
  level1Id?: number | null;
  level2Id?: number | null;
  level3Id?: number | null;
  onLevel1Change: (value: number | null) => void;
  onLevel2Change: (value: number | null) => void;
  onLevel3Change: (value: number | null) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
}

export default function SelectLocationThreeLevels({
  level1Id,
  level2Id,
  level3Id,
  onLevel1Change,
  onLevel2Change,
  onLevel3Change,
  error = false,
  helperText,
  required = false,
}: SelectLocationThreeLevelsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["locations", "three-levels"],
    queryFn: () => locationsService.findAll({ active: true, pageSize: 1000 }),
  });

  const allLocations = data?.data || [];

  const level1Options = useMemo(
    () => allLocations.filter((loc) => !loc.parentId),
    [allLocations],
  );

  const level2Options = useMemo(
    () => allLocations.filter((loc) => loc.parentId === (level1Id ?? -1)),
    [allLocations, level1Id],
  );

  const level3Options = useMemo(
    () => allLocations.filter((loc) => loc.parentId === (level2Id ?? -1)),
    [allLocations, level2Id],
  );

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <TextField
        select
        label="País / Nível 1"
        value={level1Id ?? ""}
        onChange={(e) =>
          onLevel1Change(e.target.value ? Number(e.target.value) : null)
        }
        disabled={isLoading}
        required={required}
      >
        <MenuItem value="">Selecione</MenuItem>
        {level1Options.map((loc) => (
          <MenuItem key={loc.id} value={loc.id}>
            {loc.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="UF / Nível 2"
        value={level2Id ?? ""}
        onChange={(e) =>
          onLevel2Change(e.target.value ? Number(e.target.value) : null)
        }
        disabled={isLoading || !level1Id}
        required={required}
      >
        <MenuItem value="">Selecione</MenuItem>
        {level2Options.map((loc) => (
          <MenuItem key={loc.id} value={loc.id}>
            {loc.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Cidade / Nível 3"
        value={level3Id ?? ""}
        onChange={(e) =>
          onLevel3Change(e.target.value ? Number(e.target.value) : null)
        }
        disabled={isLoading || !level2Id}
        required={required}
        error={error}
        helperText={helperText}
      >
        <MenuItem value="">Selecione</MenuItem>
        {level3Options.map((loc) => (
          <MenuItem key={loc.id} value={loc.id}>
            {loc.name}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
