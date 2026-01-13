import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import { useQuizSubmissions } from '../hooks/useQuizSubmissions';
import { useForms } from '../../forms/hooks/useForms';
import { useParticipations } from '../../participations/hooks/useParticipations';
import DataTable, { type Column } from '../../../components/common/DataTable';
import FilterChips from '../../../components/common/FilterChips';
import ErrorAlert from '../../../components/common/ErrorAlert';
import type { QuizSubmission } from '../../../types/quiz-submission.types';

const STORAGE_KEY = 'quiz-submissions-filters';

interface SavedFilters {
  page: number;
  pageSize: number;
  participationId?: number;
  formId?: number;
  startDate: string;
  endDate: string;
}

export default function QuizSubmissionsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Função para carregar filtros do localStorage
  const loadFiltersFromStorage = (): SavedFilters | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros do localStorage:', error);
    }
    return null;
  };

  // Função para salvar filtros no localStorage
  const saveFiltersToStorage = (filters: SavedFilters) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Erro ao salvar filtros no localStorage:', error);
    }
  };

  // Carregar filtros salvos ao montar o componente
  const savedFilters = loadFiltersFromStorage();

  // Verificar se há formId no state da navegação
  const stateFormId = (location.state as any)?.formId;

  const [page, setPage] = useState(savedFilters?.page || 1);
  const [pageSize, setPageSize] = useState(savedFilters?.pageSize || 20);
  const [participationId, setParticipationId] = useState<number | undefined>(
    savedFilters?.participationId
  );
  const [formId, setFormId] = useState<number | undefined>(
    stateFormId || savedFilters?.formId
  );
  const [startDate, setStartDate] = useState<string>(
    savedFilters?.startDate || ''
  );
  const [endDate, setEndDate] = useState<string>(savedFilters?.endDate || '');

  // Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    const filters: SavedFilters = {
      page,
      pageSize,
      participationId,
      formId,
      startDate,
      endDate,
    };
    saveFiltersToStorage(filters);
  }, [page, pageSize, participationId, formId, startDate, endDate]);

  // Buscar quizes para o filtro
  const { data: formsData } = useForms({
    type: 'quiz',
    page: 1,
    pageSize: 100,
  });

  // Buscar participações para o filtro
  const { data: participationsData } = useParticipations({
    page: 1,
    pageSize: 100,
  });

  // Buscar submissões
  const { data, isLoading, error } = useQuizSubmissions({
    page,
    pageSize,
    participationId,
    formId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    active: true,
  });

  const columns: Column<QuizSubmission>[] = useMemo(
    () => [
      {
        id: 'id',
        label: 'ID',
        minWidth: 70,
      },
      {
        id: 'quiz',
        label: 'Quiz',
        minWidth: 200,
        render: (row) => {
          // O backend deve retornar form_version.form.title
          const quizTitle = (row as any).formVersion?.form?.title || 'N/A';
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QuizIcon fontSize="small" color="primary" />
              <Typography variant="body2">{quizTitle}</Typography>
            </Box>
          );
        },
      },
      {
        id: 'user',
        label: 'Usuário',
        minWidth: 200,
        render: (row) => {
          const userName = (row as any).participation?.user?.name || `ID: ${(row as any).participationId}`;
          const userEmail = (row as any).participation?.user?.email || '';
          return (
            <Box>
              <Typography variant="body2">{userName}</Typography>
              {userEmail && (
                <Typography variant="caption" color="text.secondary">
                  {userEmail}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        id: 'score',
        label: 'Pontuação',
        minWidth: 120,
        align: 'center',
        render: (row) => {
          const percentage = row.percentage ?? 0;
          const isPassed = row.isPassed;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                color={isPassed ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 'bold' }}
              >
                {percentage.toFixed(1)}%
              </Typography>
              {isPassed !== null && (
                <Chip
                  label={isPassed ? 'Aprovado' : 'Reprovado'}
                  color={isPassed ? 'success' : 'error'}
                  size="small"
                />
              )}
            </Box>
          );
        },
      },
      {
        id: 'attemptNumber',
        label: 'Tentativa',
        minWidth: 100,
        align: 'center',
        render: (row) => (
          <Typography variant="body2">{row.attemptNumber}</Typography>
        ),
      },
      {
        id: 'completedAt',
        label: 'Concluído em',
        minWidth: 180,
        render: (row) => {
          if (!row.completedAt) return <Typography variant="body2">-</Typography>;
          return (
            <Typography variant="body2">
              {new Date(row.completedAt).toLocaleString('pt-BR')}
            </Typography>
          );
        },
      },
      {
        id: 'actions',
        label: 'Ações',
        minWidth: 120,
        align: 'center',
        render: (row) => (
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => {
              navigate(`/quiz-submissions/${row.id}`);
            }}
          >
            Ver
          </Button>
        ),
      },
    ],
    [navigate]
  );

  const filters = useMemo(() => {
    const filterList: Array<{ label: string; value: string | number; onDelete?: () => void }> = [];
    if (participationId) {
      filterList.push({
        label: 'Participação',
        value: participationId,
        onDelete: () => setParticipationId(undefined),
      });
    }
    if (formId) {
      const form = formsData?.data?.find((f) => f.id === formId);
      filterList.push({
        label: 'Quiz',
        value: form?.title || formId,
        onDelete: () => setFormId(undefined),
      });
    }
    if (startDate) {
      filterList.push({
        label: 'De',
        value: new Date(startDate).toLocaleDateString('pt-BR'),
        onDelete: () => setStartDate(''),
      });
    }
    if (endDate) {
      filterList.push({
        label: 'Até',
        value: new Date(endDate).toLocaleDateString('pt-BR'),
        onDelete: () => setEndDate(''),
      });
    }
    return filterList;
  }, [participationId, formId, startDate, endDate, formsData]);

  if (error) {
    return <ErrorAlert message="Erro ao carregar submissões de quizes" />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">Submissões de Quizes</Typography>
      </Box>

      <Stack spacing={2} sx={{ width: '100%' }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Participação</InputLabel>
                <Select
                  value={participationId || ''}
                  label="Participação"
                  onChange={(e) =>
                    setParticipationId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                >
                  <MenuItem value="">Todas</MenuItem>
                  {participationsData?.data?.map((participation) => (
                    <MenuItem key={participation.id} value={participation.id}>
                      ID: {participation.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Quiz</InputLabel>
                <Select
                  value={formId || ''}
                  label="Quiz"
                  onChange={(e) =>
                    setFormId(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <MenuItem value="">Todos</MenuItem>
                  {formsData?.data?.map((form) => (
                    <MenuItem key={form.id} value={form.id}>
                      {form.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Data inicial"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
              />

              <TextField
                label="Data final"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
              />
            </Box>
          </Stack>
        </Paper>

        <FilterChips
          filters={filters}
          onClearAll={() => {
            setParticipationId(undefined);
            setFormId(undefined);
            setStartDate('');
            setEndDate('');
            setPage(1);
            localStorage.removeItem(STORAGE_KEY);
          }}
        />

        <DataTable
          columns={columns}
          data={data?.data || []}
          page={page}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems || 0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={isLoading}
          variant="table"
        />
      </Stack>
    </Box>
  );
}

