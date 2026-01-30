import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
} from "@mui/material";
import {
  FileDownload as FileDownloadIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import DataTable, { type Column } from "../../components/common/DataTable";
import FilterChips from "../../components/common/FilterChips";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorAlert from "../../components/common/ErrorAlert";
import SelectParticipationSearch from "../../components/common/SelectParticipationSearch";
import { useDebounce } from "../../hooks/useDebounce";
import { useTrackExecutions } from "../track-progress/hooks/useTrackProgress";
import { useTrackCycles } from "../track-cycles/hooks/useTrackCycles";
import { useParticipation } from "../participations/hooks/useParticipations";
import type {
  TrackExecutionRow,
  TrackExecutionsQueryParams,
} from "../../types/track-progress.types";
import type { TrackCycle } from "../../types/track-cycle.types";
import type { Participation } from "../../types/participation.types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_PAGE_SIZE = 15;

export default function TrackExecutionRegistry() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [trackCycleId, setTrackCycleId] = useState<number | undefined>(
    undefined,
  );
  const [participationId, setParticipationId] = useState<number | undefined>(
    undefined,
  );
  const [selectedParticipation, setSelectedParticipation] =
    useState<Participation | null>(null);
  const [sequenceType, setSequenceType] = useState<
    "content" | "quiz" | undefined
  >(undefined);
  const [activityNameInput, setActivityNameInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const activityName = useDebounce(activityNameInput, 400);

  const queryParams: TrackExecutionsQueryParams = useMemo(() => {
    const params: TrackExecutionsQueryParams = {};
    if (trackCycleId != null) params.trackCycleId = trackCycleId;
    if (participationId != null) params.participationId = participationId;
    if (sequenceType) params.sequenceType = sequenceType;
    if (activityName.trim()) params.activityName = activityName.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [
    trackCycleId,
    participationId,
    sequenceType,
    activityName,
    dateFrom,
    dateTo,
  ]);

  const {
    data: executions = [],
    isLoading,
    error,
  } = useTrackExecutions(queryParams);
  const { data: cycles = [] } = useTrackCycles({ active: true });
  const { data: participationDetail } = useParticipation(
    participationId ?? null,
  );

  const paginatedData = useMemo(
    () => executions.slice((page - 1) * pageSize, page * pageSize),
    [executions, page, pageSize],
  );

  const handleExportCSV = () => {
    const headers = [
      "Ciclo de Trilha",
      "Atividade",
      "Tipo da Sequência",
      "Participante",
      "Data de Conclusão",
    ];
    const rows = executions.map((row) => [
      row.trackCycleName,
      row.activityName,
      row.sequenceType === "quiz" ? "Quiz" : "Conteúdo",
      row.participantName,
      row.completedAt
        ? format(new Date(row.completedAt), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })
        : "-",
    ]);
    const csvContent = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(";"),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
      ),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `execucoes_trilhas_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setTrackCycleId(undefined);
    setParticipationId(undefined);
    setSelectedParticipation(null);
    setSequenceType(undefined);
    setActivityNameInput("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const activeFilters = [
    ...(trackCycleId != null && cycles.find((c) => c.id === trackCycleId)
      ? [
          {
            label: "Ciclo de Trilha",
            value: cycles.find((c) => c.id === trackCycleId)?.name,
            onDelete: () => setTrackCycleId(undefined),
          },
        ]
      : []),
    ...(participationId != null
      ? [
          {
            label: "Participante",
            value:
              participationDetail?.userName ??
              selectedParticipation?.userName ??
              `#${participationId}`,
            onDelete: () => {
              setParticipationId(undefined);
              setSelectedParticipation(null);
            },
          },
        ]
      : []),
    ...(sequenceType
      ? [
          {
            label: "Tipo",
            value: sequenceType === "quiz" ? "Quiz" : "Conteúdo",
            onDelete: () => setSequenceType(undefined),
          },
        ]
      : []),
    ...(activityName.trim()
      ? [
          {
            label: "Atividade",
            value: activityName.trim(),
            onDelete: () => setActivityNameInput(""),
          },
        ]
      : []),
    ...(dateFrom
      ? [
          {
            label: "Data de",
            value: dateFrom,
            onDelete: () => setDateFrom(""),
          },
        ]
      : []),
    ...(dateTo
      ? [
          {
            label: "Data até",
            value: dateTo,
            onDelete: () => setDateTo(""),
          },
        ]
      : []),
  ];

  const columns: Column<TrackExecutionRow>[] = [
    {
      id: "trackCycleName",
      label: "Ciclo de Trilha",
      minWidth: 180,
      mobileLabel: "Ciclo",
      render: (row) => row.trackCycleName,
    },
    {
      id: "activityName",
      label: "Atividade",
      minWidth: 200,
      mobileLabel: "Atividade",
      render: (row) => row.activityName,
    },
    {
      id: "sequenceType",
      label: "Tipo da Sequência",
      minWidth: 120,
      mobileLabel: "Tipo",
      render: (row) => (row.sequenceType === "quiz" ? "Quiz" : "Conteúdo"),
    },
    {
      id: "participantName",
      label: "Participante",
      minWidth: 180,
      mobileLabel: "Participante",
      render: (row) => row.participantName,
    },
    {
      id: "completedAt",
      label: "Data de Conclusão",
      minWidth: 160,
      mobileLabel: "Conclusão",
      render: (row) =>
        row.completedAt
          ? format(new Date(row.completedAt), "dd/MM/yyyy HH:mm", {
              locale: ptBR,
            })
          : "-",
    },
    {
      id: "actions",
      label: "Ações",
      minWidth: 100,
      mobileLabel: "Ações",
      render: (row) => (
        <Button
          component={Link}
          to={`/admin/track-cycles/${row.trackCycleId}/participation/${row.participationId}/trilha`}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          startIcon={<OpenInNewIcon fontSize="small" />}
          variant="outlined"
        >
          Ver trilha
        </Button>
      ),
    },
  ];

  if (error)
    return (
      <ErrorAlert
        message={
          error instanceof Error ? error.message : "Erro ao carregar execuções"
        }
      />
    );

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Registro de Execução das Trilhas
        </Typography>
        <Button
          variant="outlined"
          color="success"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportCSV}
          disabled={executions.length === 0}
        >
          Exportar CSV
        </Button>
      </Stack>

      {/* Filtros */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        mb={2}
        flexWrap="wrap"
        useFlexGap
      >
        <Autocomplete
          sx={{ minWidth: 260 }}
          options={cycles}
          getOptionLabel={(opt: TrackCycle) => opt.name ?? ""}
          value={cycles.find((c) => c.id === trackCycleId) ?? null}
          onChange={(_, v) => setTrackCycleId(v?.id)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Ciclo de Trilha"
              size="small"
              placeholder="Todos"
            />
          )}
        />
        <TextField
          size="small"
          label="Atividade (nome)"
          value={activityNameInput}
          onChange={(e) => setActivityNameInput(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Tipo da Sequência</InputLabel>
          <Select
            value={sequenceType ?? "all"}
            label="Tipo da Sequência"
            onChange={(e) => {
              const v = e.target.value;
              setSequenceType(
                v === "all" ? undefined : (v as "content" | "quiz"),
              );
            }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="content">Conteúdo</MenuItem>
            <MenuItem value="quiz">Quiz</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ minWidth: 260 }}>
          <SelectParticipationSearch
            value={selectedParticipation}
            onChange={(p) => {
              setSelectedParticipation(p);
              setParticipationId(p?.id);
            }}
            valueId={participationId ?? undefined}
            label="Participante"
            placeholder="Digite para buscar no servidor..."
            size="small"
          />
        </Box>
        <TextField
          size="small"
          label="Data de conclusão de"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          size="small"
          label="Data de conclusão até"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
      </Stack>

      {activeFilters.length > 0 && (
        <FilterChips filters={activeFilters} onClearAll={clearFilters} />
      )}

      {isLoading ? (
        <Box sx={{ mt: 4 }}>
          <LoadingSpinner />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          data={paginatedData}
          page={page}
          pageSize={pageSize}
          totalItems={executions.length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          variant="table"
          emptyMessage="Nenhuma execução encontrada. Ajuste os filtros ou aguarde conclusões de atividades."
        />
      )}
    </Box>
  );
}
