import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
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
import { useFormVersion, useDeleteFormVersion } from '../hooks/useFormVersions';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import FormPreview from '../../../components/form-builder/FormPreview';
import FormDataDictionary from '../components/FormDataDictionary';
import type { FormBuilderDefinition } from '../../../types/form-builder.types';

export default function FormVersionViewPage() {
  const { formId: formIdParam, id: idParam } = useParams<{ formId: string; id: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const formId = formIdParam ? parseInt(formIdParam, 10) : null;
  const versionId = idParam ? parseInt(idParam, 10) : null;

  const { data: version, isLoading, error } = useFormVersion(formId, versionId);
  const deleteMutation = useDeleteFormVersion();

  const handleDelete = () => {
    if (formId && versionId) {
      deleteMutation.mutate(
        { formId, id: versionId },
        {
          onSuccess: () => {
            navigate(`/forms/${formId}`);
          },
        },
      );
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !version) {
    return <ErrorAlert message="Erro ao carregar versão do formulário" />;
  }

  const definition: FormBuilderDefinition = version.definition || { fields: [] };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(`/forms/${formId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Versão {version.versionNumber}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/forms/${formId}/versions/${versionId}/edit`)}
        >
          Editar
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          Deletar
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              ID
            </Typography>
            <Typography variant="body1">{version.id}</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              Número da Versão
            </Typography>
            <Typography variant="body1">{version.versionNumber}</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              Tipo de Acesso
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={version.accessType === 'PUBLIC' ? 'Público' : 'Privado'}
                color={version.accessType === 'PUBLIC' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={version.active ? 'Ativo' : 'Inativo'}
                color={version.active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Preview" />
          <Tab label="Dicionário de Dados" />
          <Tab label="JSON" />
        </Tabs>

        {activeTab === 0 && <FormPreview definition={definition} />}

        {activeTab === 1 && <FormDataDictionary definition={definition} />}

        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Definição JSON
            </Typography>
            <pre
              style={{
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '600px',
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '4px',
              }}
            >
              {JSON.stringify(definition, null, 2)}
            </pre>
          </Box>
        )}
      </Paper>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar exclusão"
        message="Tem certeza que deseja deletar esta versão do formulário?"
        confirmText="Deletar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}

