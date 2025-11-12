import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  Divider,
  Stack,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useContext as useContextQuery, useDeleteContext } from '../hooks/useContexts';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { useTranslation } from '../../../hooks/useTranslation';
import ContextManagersList from '../../context-managers/components/ContextManagersList';
import ContextManagerCreate from '../../context-managers/components/ContextManagerCreate';

export default function ContextViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const contextId = id ? parseInt(id, 10) : null;
  const {
    data: context,
    isLoading,
    error,
  } = useContextQuery(contextId);

  const deleteMutation = useDeleteContext();

  const handleDelete = () => {
    if (contextId) {
      deleteMutation.mutate(contextId, {
        onSuccess: () => {
          navigate('/contexts');
        },
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !context) {
    return <ErrorAlert message={t('contexts.errorLoadingContext')} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/contexts')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {t('contexts.title')} #{context.id}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/contexts/${context.id}/edit`)}
        >
          {t('common.edit')}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          {t('common.delete')}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('contexts.name')}
            </Typography>
            <Typography variant="body1">{context.name}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('contexts.location')}
            </Typography>
            <Typography variant="body1">
              {context.locationId ? (
                <Button
                  variant="text"
                  onClick={() => navigate(`/locations/${context.locationId}`)}
                  sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                >
                  #{context.locationId}
                </Button>
              ) : (
                '-'
              )}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('contexts.accessType')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={
                  context.accessType === 'PUBLIC'
                    ? t('contexts.accessTypePublic')
                    : t('contexts.accessTypePrivate')
                }
                color={context.accessType === 'PUBLIC' ? 'primary' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('contexts.status')}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={context.active ? t('contexts.active') : t('contexts.inactive')}
                color={context.active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {context.description && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('contexts.description')}
                </Typography>
                <Typography variant="body1">{context.description}</Typography>
              </Box>
            </>
          )}

          {context.type && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('contexts.type')}
                </Typography>
                <Typography variant="body1">{context.type}</Typography>
              </Box>
            </>
          )}

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('contexts.createdAt')}
            </Typography>
            <Typography variant="body1">
              {format(new Date(context.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('contexts.updatedAt')}
            </Typography>
            <Typography variant="body1">
              {format(new Date(context.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label={t('contexts.tabManagers')} />
          <Tab label={t('contexts.tabNewManager')} />
          <Tab label={t('contexts.tabParticipations')} />
          <Tab label={t('contexts.tabForms')} />
        </Tabs>

        {activeTab === 0 && <ContextManagersList contextId={contextId} />}
        {activeTab === 1 && (
          <ContextManagerCreate
            contextId={contextId}
            onSuccess={() => setActiveTab(0)}
          />
        )}
        {activeTab === 2 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            {t('contexts.participationsComingSoon')}
          </Typography>
        )}
        {activeTab === 3 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            {t('contexts.formsComingSoon')}
          </Typography>
        )}
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('contexts.deleteConfirm')}
        message={t('contexts.deleteMessage', { name: context.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}


