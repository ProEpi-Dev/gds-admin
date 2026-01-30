import { Chip } from '@mui/material';
import { ProgressStatus } from '../../types/track-progress.types';

const STATUS_LABELS: Record<ProgressStatus, string> = {
  [ProgressStatus.NOT_STARTED]: 'Não Iniciado',
  [ProgressStatus.IN_PROGRESS]: 'Em Progresso',
  [ProgressStatus.COMPLETED]: 'Concluído',
};

const STATUS_COLORS: Record<ProgressStatus, 'default' | 'primary' | 'success'> = {
  [ProgressStatus.NOT_STARTED]: 'default',
  [ProgressStatus.IN_PROGRESS]: 'primary',
  [ProgressStatus.COMPLETED]: 'success',
};

interface ProgressStatusChipProps {
  status: ProgressStatus;
  size?: 'small' | 'medium';
}

export default function ProgressStatusChip({ status, size = 'small' }: ProgressStatusChipProps) {
  return (
    <Chip
      label={STATUS_LABELS[status]}
      color={STATUS_COLORS[status]}
      size={size}
    />
  );
}
