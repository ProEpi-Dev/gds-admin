import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import DataTable, { type Column } from '../../../components/common/DataTable';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import SelectParticipationSearch from '../../../components/common/SelectParticipationSearch';
import { useTrackCycle, useStudentsProgress } from '../hooks/useTrackCycles';
import { useStartTrackProgress } from '../../track-progress/hooks/useTrackProgress';
import { ProgressStatus } from '../../../types/track-progress.types';
import type { StudentProgress } from '../../../types/track-cycle.types';
import type { Participation } from '../../../types/participation.types';

const STATUS_LABELS: Record<string, string> = {
  [ProgressStatus.NOT_STARTED]: 'Não Iniciado',
  [ProgressStatus.IN_PROGRESS]: 'Em Progresso',
  [ProgressStatus.COMPLETED]: 'Concluído',
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success'> = {
  [ProgressStatus.NOT_STARTED]: 'default',
  [ProgressStatus.IN_PROGRESS]: 'primary',
  [ProgressStatus.COMPLETED]: 'success',
};

export default function TrackCycleStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cycleId = id ? parseInt(id) : null;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedParticipation, setSelectedParticipation] = useState<Participation | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: cycle, isLoading: isLoadingCycle, error: cycleError } = useTrackCycle(cycleId);
  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useStudentsProgress(cycleId);
  const contextId = cycle?.context_id ?? cycle?.context?.id ?? null;
  const startProgressMutation = useStartTrackProgress();

  const alreadyInCycle = new Set((students ?? []).map((s) => s.participation_id));
  const excludeParticipationIds = Array.from(alreadyInCycle);

  const handleAddParticipant = () => {
    if (!selectedParticipation || !cycleId) return;
    startProgressMutation.mutate(
      { trackCycleId: cycleId, participationId: selectedParticipation.id },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setSelectedParticipation(null);
        },
      },
    );
  };

  const columns: Column<StudentProgress>[] = [
    {
      id: 'user',
      label: 'Participante',
      minWidth: 200,
      mobileLabel: 'Participante',
      render: (row) => (
        <Stack>
          <Typography variant="body2" fontWeight="medium">
            {row.participation.user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.participation.user.email}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 130,
      mobileLabel: 'Status',
      render: (row) => (
        <Chip
          label={STATUS_LABELS[row.status] || row.status}
          color={STATUS_COLORS[row.status] || 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'progress',
      label: 'Progresso',
      minWidth: 200,
      mobileLabel: 'Progresso',
      render: (row) => (
        <Stack spacing={0.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={row.progress_percentage ?? 0}
              sx={{ flex: 1, height: 8, borderRadius: 1 }}
            />
            <Typography variant="body2" fontWeight="medium">
              {(row.progress_percentage ?? 0).toFixed(0)}%
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      id: 'started_at',
      label: 'Iniciado em',
      minWidth: 120,
      mobileLabel: 'Iniciado',
      render: (row) =>
        row.started_at
          ? new Date(row.started_at).toLocaleDateString('pt-BR')
          : '-',
    },
    {
      id: 'completed_at',
      label: 'Concluído em',
      minWidth: 120,
      mobileLabel: 'Concluído',
      render: (row) =>
        row.completed_at
          ? new Date(row.completed_at).toLocaleDateString('pt-BR')
          : '-',
    },
    {
      id: 'actions',
      label: 'Ações',
      minWidth: 100,
      mobileLabel: 'Ações',
      render: (row) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/track-cycles/${cycleId}/participation/${row.participation_id}/trilha`);
          }}
          title="Percorrer trilha como este participante"
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  if (isLoadingCycle || isLoadingStudents) return <LoadingSpinner />;
  if (cycleError) return <ErrorAlert message={cycleError instanceof Error ? cycleError.message : String(cycleError)} />;
  if (studentsError) return <ErrorAlert message={studentsError instanceof Error ? studentsError.message : String(studentsError)} />;
  if (!cycle) return <ErrorAlert message="Ciclo não encontrado" />;

  const completedCount = students?.filter((s) => s.status === ProgressStatus.COMPLETED).length || 0;
  const inProgressCount = students?.filter((s) => s.status === ProgressStatus.IN_PROGRESS).length || 0;
  const totalStudents = students?.length || 0;
  const avgProgress = totalStudents > 0
    ? (students?.reduce((sum, s) => sum + (s.progress_percentage ?? 0), 0) || 0) / totalStudents
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/track-cycles')}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" component="h1" gutterBottom>
              Participantes - {cycle.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Trilha: {cycle.track?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Contexto: {cycle.context?.name}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Adicionar participante
          </Button>
        </Stack>
      </Paper>

      {/* Dialog Adicionar participante */}
      <Dialog open={addDialogOpen} onClose={() => !startProgressMutation.isPending && setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Iniciar ciclo para participação</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Selecione uma participação do mesmo contexto ({cycle.context?.name}) para iniciar o ciclo de trilha.
          </Alert>
          <SelectParticipationSearch
            value={selectedParticipation}
            onChange={setSelectedParticipation}
            contextId={contextId ?? undefined}
            excludeParticipationIds={excludeParticipationIds}
            label="Participação"
            placeholder="Digite para buscar por nome ou email"
            noOptionsText={
              excludeParticipationIds.length > 0
                ? 'Todas as participações deste contexto já estão no ciclo'
                : 'Nenhuma participação encontrada'
            }
          />
          {startProgressMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(startProgressMutation.error as Error)?.message ?? 'Erro ao iniciar ciclo'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={startProgressMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAddParticipant}
            disabled={!selectedParticipation || startProgressMutation.isPending}
            startIcon={startProgressMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            Iniciar ciclo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Estatísticas */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Estatísticas
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          <Box>
            <Typography variant="h3" color="primary">
              {totalStudents}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total de Participantes
            </Typography>
          </Box>
          <Box>
            <Typography variant="h3" color="success.main">
              {completedCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Concluíram
            </Typography>
          </Box>
          <Box>
            <Typography variant="h3" color="primary.main">
              {inProgressCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Em Progresso
            </Typography>
          </Box>
          <Box>
            <Typography variant="h3" color="info.main">
              {avgProgress.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Progresso Médio
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Tabela de participantes */}
      <Paper>
        <DataTable
          columns={columns}
          data={(students || []).slice((page - 1) * pageSize, page * pageSize)}
          page={page}
          pageSize={pageSize}
          totalItems={(students || []).length}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      </Paper>

      {totalStudents === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
          <Typography color="text.secondary">
            Nenhum participante iniciou este ciclo ainda.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
