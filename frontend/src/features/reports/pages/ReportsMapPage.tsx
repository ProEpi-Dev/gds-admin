import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useReportsPoints } from '../hooks/useReports';
import { useForms } from '../../forms/hooks/useForms';
import ReportsMapView from '../components/ReportsMapView';
import { useTranslation } from '../../../hooks/useTranslation';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';

export default function ReportsMapPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Estado dos filtros
  const [formId, setFormId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Último mês
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchParams, setSearchParams] = useState<{
    formId?: number;
    startDate: string;
    endDate: string;
  } | null>(null);

  // Buscar formulários para o filtro
  const { data: formsData, isLoading: formsLoading } = useForms({
    page: 1,
    pageSize: 100,
    active: true,
  });

  // Buscar pontos quando searchParams mudar
  const {
    data: points,
    isLoading: pointsLoading,
    error: pointsError,
  } = useReportsPoints(
    searchParams || {
      startDate: '',
      endDate: '',
    },
  );

  const handleSearch = () => {
    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      return;
    }

    setSearchParams({
      formId,
      startDate,
      endDate,
    });
  };

  const forms = formsData?.data || [];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reports')}
            variant="outlined"
          >
            {t('common.back')}
          </Button>
          <Typography variant="h4">{t('reports.mapView')}</Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h6">{t('reports.filters')}</Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>{t('reports.form')}</InputLabel>
              <Select
                value={formId || ''}
                label={t('reports.form')}
                onChange={(e) => setFormId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <MenuItem value="">
                  <em>{t('reports.allForms')}</em>
                </MenuItem>
                {formsLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} />
                  </MenuItem>
                ) : (
                  forms.map((form: any) => (
                    <MenuItem key={form.id} value={form.id}>
                      {form.title}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              label={t('reports.startDate')}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />

            <TextField
              label={t('reports.endDate')}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />

            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={!startDate || !endDate || pointsLoading}
              sx={{ minWidth: 120 }}
            >
              {t('common.search')}
            </Button>
          </Stack>

          {startDate && endDate && new Date(startDate) > new Date(endDate) && (
            <Alert severity="error">
              {t('reports.invalidDateRange')}
            </Alert>
          )}
        </Stack>
      </Paper>

      {pointsError && (
        <ErrorAlert message={t('reports.errorLoadingPoints')} />
      )}

      {searchParams && (
        <Paper sx={{ p: 3 }}>
          {pointsLoading ? (
            <LoadingSpinner />
          ) : points && points.length > 0 ? (
            <ReportsMapView points={points} />
          ) : (
            <Alert severity="info">
              {t('reports.noPointsFound')}
            </Alert>
          )}
        </Paper>
      )}

      {!searchParams && (
        <Paper sx={{ p: 3 }}>
          <Alert severity="info">
            {t('reports.selectFiltersAndSearch')}
          </Alert>
        </Paper>
      )}
    </Box>
  );
}

