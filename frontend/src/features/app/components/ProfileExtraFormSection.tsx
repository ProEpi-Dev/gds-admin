import { Box, Divider, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import FormRenderer from '../../../components/form-renderer/FormRenderer';
import { participationProfileExtraService } from '../../../api/services/participation-profile-extra.service';
import { ensureFormDefinition } from '../../forms/utils/formDefinitionValidator';
import { useTranslation } from '../../../hooks/useTranslation';
import type { FormBuilderDefinition } from '../../../types/form-builder.types';

interface ProfileExtraFormSectionProps {
  onValuesChange: (values: Record<string, unknown>) => void;
}

export default function ProfileExtraFormSection({
  onValuesChange,
}: ProfileExtraFormSectionProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['participation-profile-extra-me'],
    queryFn: () => participationProfileExtraService.getMe(),
  });

  if (isLoading || !data?.form) {
    return null;
  }

  const definition = ensureFormDefinition(
    data.form.version.definition as FormBuilderDefinition,
  );
  const initialValues =
    data.submission?.formVersionId === data.form.version.id
      ? { ...data.submission.response }
      : {};

  return (
    <>
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>
        {t('profile.profileExtraTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('profile.profileExtraSubtitle')}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <FormRenderer
          key={data.form.version.id}
          definition={definition}
          initialValues={initialValues}
          onChange={onValuesChange}
          isQuiz={false}
        />
      </Box>
    </>
  );
}
