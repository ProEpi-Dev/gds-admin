import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useGender } from '../hooks/useGenders';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import { useTranslation } from '../../../hooks/useTranslation';

export default function GenderViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const genderId = id ? parseInt(id, 10) : null;
  const { data: gender, isLoading, error } = useGender(genderId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !gender) {
    return <ErrorAlert message={t('genders.errorLoading')} />;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t('genders.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/genders')}
          >
            {t('common.back')}
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/genders/${genderId}/edit`)}
          >
            {t('common.edit')}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('genders.name')}
            </Typography>
            <Typography variant="body1">{gender.name}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('genders.status')}
            </Typography>
            <Chip
              label={gender.active ? t('genders.active') : t('genders.inactive')}
              color={gender.active ? 'success' : 'default'}
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('common.createdAt')}
            </Typography>
            <Typography variant="body1">
              {new Date(gender.createdAt).toLocaleString('pt-BR')}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('common.updatedAt')}
            </Typography>
            <Typography variant="body1">
              {new Date(gender.updatedAt).toLocaleString('pt-BR')}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
