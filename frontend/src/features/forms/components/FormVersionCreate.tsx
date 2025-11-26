import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Alert } from '@mui/material';
import { useCreateFormVersion, useFormVersions } from '../hooks/useFormVersions';
import { getErrorMessage } from '../../../utils/errorHandler';
import type { CreateFormVersionDto } from '../../../types/form-version.types';
import type { FormBuilderDefinition } from '../../../types/form-builder.types';
import { ensureFormDefinition } from '../utils/formDefinitionValidator';
import FormVersionEditor from './FormVersionEditor';

interface FormVersionCreateProps {
  formId: number | null;
}

export default function FormVersionCreate({ formId }: FormVersionCreateProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [initialDefinition, setInitialDefinition] = useState<FormBuilderDefinition>({
    fields: [],
  });
  const [initialAccessType, setInitialAccessType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [initialActive, setInitialActive] = useState<boolean>(true);

  // Buscar versões do formulário para encontrar a última versão
  const { data: versionsData } = useFormVersions(formId, { page: 1, pageSize: 50 });

  const createMutation = useCreateFormVersion();

  // Carregar campos da última versão quando disponível
  useEffect(() => {
    if (versionsData?.data && versionsData.data.length > 0) {
      // Ordenar por versionNumber descendente para pegar a última versão
      const sortedVersions = [...versionsData.data].sort(
        (a, b) => b.versionNumber - a.versionNumber,
      );
      const latestVersion = sortedVersions[0];

      if (latestVersion?.definition) {
        const normalizedDefinition = ensureFormDefinition(latestVersion.definition);
        setInitialDefinition(normalizedDefinition);
        setInitialAccessType(latestVersion.accessType || 'PUBLIC');
        setInitialActive(latestVersion.active ?? true);
      }
    }
  }, [versionsData]);

  const handleSubmit = (data: {
    accessType?: 'PUBLIC' | 'PRIVATE';
    active?: boolean;
    definition: FormBuilderDefinition;
  }) => {
    if (!formId) return;

    setError(null);
    const formData: CreateFormVersionDto = {
      accessType: data.accessType || 'PUBLIC',
      definition: data.definition,
      active: data.active,
    };

    createMutation.mutate(
      { formId, data: formData },
      {
        onSuccess: (version) => {
          navigate(`/forms/${formId}/versions/${version.id}`);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err, 'Erro ao criar versão'));
        },
      },
    );
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <FormVersionEditor
        initialDefinition={initialDefinition}
        initialAccessType={initialAccessType}
        initialActive={initialActive}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/forms/${formId}`)}
        isLoading={createMutation.isPending}
        submitLabel="Criar Versão"
        title="Criar Nova Versão"
      />
    </Box>
  );
}

