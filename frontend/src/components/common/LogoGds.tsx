import { Box } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';

const LOGO_SRC = '/logo_gds.svg';

type Props = {
  /** Altura do símbolo em px (largura proporcional ao viewBox do SVG). */
  height?: number;
  /**
   * Quando true, envolve em fundo escuro (secondary) — útil em AppBar clara
   * ou cartão branco, pois o SVG é branco/transparente.
   */
  withDarkBackdrop?: boolean;
};

export default function LogoGds({ height = 36, withDarkBackdrop = false }: Props) {
  const { t } = useTranslation();
  const alt = t('layout.appTitle');

  const img = (
    <Box
      component="img"
      src={LOGO_SRC}
      alt={alt}
      sx={{ height, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  );

  if (!withDarkBackdrop) {
    return img;
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'secondary.main',
        borderRadius: 1.5,
        px: 1,
        py: 0.5,
      }}
    >
      {img}
    </Box>
  );
}
