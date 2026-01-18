import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

interface LegalDocumentViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  version: string;
}

export default function LegalDocumentViewer({
  open,
  onClose,
  title,
  content,
  version,
}: LegalDocumentViewerProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {title}
        <Typography variant="caption" color="text.secondary" display="block">
          Versão {version}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {content}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
