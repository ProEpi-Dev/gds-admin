import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { useFormVersion, useUpdateFormVersion, useFormVersions } from '../hooks/useFormVersions';
import { useForm } from '../hooks/useForms';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../../utils/errorHandler';
import { useSnackbar } from '../../../hooks/useSnackbar';
import type { UpdateFormVersionDto } from '../../../types/form-version.types';
import type { FormBuilderDefinition } from '../../../types/form-builder.types';
import { ensureFormDefinition } from '../utils/formDefinitionValidator';
import FormVersionEditor from '../components/FormVersionEditor';

export default function FormVersionEditPage() {
  const { formId: formIdParam, id: idParam } = useParams<{ formId: string; id: string }>();
  const navigate = useNavigate();
  const snackbar = useSnackbar();

  const formId = formIdParam ? parseInt(formIdParam, 10) : null;
  const versionId = idParam ? parseInt(idParam, 10) : null;

  const { data: version, isLoading, error: queryError } = useFormVersion(formId, versionId);
  // Buscar o formulário para saber o tipo (quiz ou signal)
  const { data: form } = useForm(formId);
  // Buscar todas as versões para calcular o próximo número de versão
  const { data: versionsData } = useFormVersions(formId, { page: 1, pageSize: 50 });

  const updateMutation = useUpdateFormVersion();
  const [currentDefinition, setCurrentDefinition] = useState<FormBuilderDefinition>({ fields: [] });

  // Memoizar initialDefinition antes dos early returns para seguir as regras dos hooks
  const initialDefinition = useMemo(
    () => ensureFormDefinition(version?.definition || { fields: [] }),
    [version?.definition],
  );

  // Calcular o próximo número de versão
  const getNextVersionNumber = (): number => {
    if (!versionsData?.data || versionsData.data.length === 0) {
      return (version?.versionNumber || 0) + 1;
    }
    const sortedVersions = [...versionsData.data].sort(
      (a, b) => b.versionNumber - a.versionNumber,
    );
    const latestVersion = sortedVersions[0];
    return latestVersion.versionNumber + 1;
  };

  // Verificar se a definição mudou (comparação mais robusta)
  const hasDefinitionChanged = (newDefinition: FormBuilderDefinition): boolean => {
    if (!version) return false;
    const currentDef = ensureFormDefinition(version.definition || { fields: [] });
    const newDef = ensureFormDefinition(newDefinition);
    
    // Comparar usando JSON.stringify com ordenação de chaves
    const normalize = (def: FormBuilderDefinition) => {
      return JSON.stringify(def, Object.keys(def).sort());
    };
    
    return normalize(currentDef) !== normalize(newDef);
  };

  const handleSubmit = (data: {
    accessType?: 'PUBLIC' | 'PRIVATE';
    active?: boolean;
    definition: FormBuilderDefinition;
    passingScore?: number | null;
    maxAttempts?: number | null;
    timeLimitMinutes?: number | null;
    showFeedback?: boolean;
    randomizeQuestions?: boolean;
  }) => {
    if (!formId || !versionId) return;

    const formData: UpdateFormVersionDto = {
      accessType: data.accessType,
      definition: data.definition,
      active: data.active,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      timeLimitMinutes: data.timeLimitMinutes,
      showFeedback: data.showFeedback,
      randomizeQuestions: data.randomizeQuestions,
    };

    updateMutation.mutate(
      { formId, id: versionId, data: formData },
      {
        onSuccess: (newVersion) => {
          // Se uma nova versão foi criada (ID diferente), redirecionar para ela
          // Caso contrário, redirecionar para a versão atual
          const redirectVersionId = newVersion.id !== versionId ? newVersion.id : versionId;
          if (newVersion.id !== versionId) {
            snackbar.showSuccess('Nova versão criada com sucesso');
          } else {
            snackbar.showSuccess('Versão atualizada com sucesso');
          }
          navigate(`/forms/${formId}/versions/${redirectVersionId}`);
        },
        onError: (err: unknown) => {
          const errorMessage = getErrorMessage(err, 'Erro ao atualizar versão');
          snackbar.showError(errorMessage);
        },
      },
    );
  };

  // Inicializar currentDefinition quando version carregar
  useEffect(() => {
    if (version) {
      setCurrentDefinition(initialDefinition);
    }
  }, [version, initialDefinition]);

  useEffect(() => {
    if (queryError) {
      snackbar.showError('Erro ao carregar versão do formulário');
    }
  }, [queryError, snackbar]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (queryError || !version) {
    return null; // Erro já foi tratado pelo useEffect
  }

  const nextVersionNumber = getNextVersionNumber();

  const willCreateNewVersion = hasDefinitionChanged(currentDefinition);

  return (
    <Box>

      <FormVersionEditor
        initialDefinition={initialDefinition}
        initialAccessType={version.accessType}
        initialActive={version.active}
        formType={form?.type}
        initialPassingScore={version.passingScore}
        initialMaxAttempts={version.maxAttempts}
        initialTimeLimitMinutes={version.timeLimitMinutes}
        initialShowFeedback={version.showFeedback}
        initialRandomizeQuestions={version.randomizeQuestions}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/forms/${formId}/versions/${versionId}`)}
        isLoading={updateMutation.isPending}
        submitLabel="Salvar"
        title={`Editar Versão ${version.versionNumber}`}
        showNewVersionWarning={willCreateNewVersion}
        nextVersionNumber={nextVersionNumber}
        currentVersionNumber={version.versionNumber}
        onDefinitionChange={setCurrentDefinition}
      />
    </Box>
  );
}

