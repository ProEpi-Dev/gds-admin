import { useState } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Button,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import LegalDocumentViewer from '../common/LegalDocumentViewer';
import type { LegalDocument } from '../../types/legal-document.types';

interface LegalDocumentsAcceptanceProps {
  documents: LegalDocument[];
  acceptedIds: number[];
  onAcceptedChange: (ids: number[]) => void;
  error?: boolean;
  helperText?: string;
}

export default function LegalDocumentsAcceptance({
  documents,
  acceptedIds,
  onAcceptedChange,
  error = false,
  helperText,
}: LegalDocumentsAcceptanceProps) {
  const [viewingDocument, setViewingDocument] = useState<LegalDocument | null>(null);

  const handleToggle = (documentId: number) => {
    if (acceptedIds.includes(documentId)) {
      onAcceptedChange(acceptedIds.filter((id) => id !== documentId));
    } else {
      onAcceptedChange([...acceptedIds, documentId]);
    }
  };

  const requiredDocuments = documents.filter((doc) => doc.isRequired);
  const allRequiredAccepted = requiredDocuments.every((doc) =>
    acceptedIds.includes(doc.id)
  );

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Documentos Legais {requiredDocuments.length > 0 && '*'}
      </Typography>

      {documents.map((document) => (
        <Paper
          key={document.id}
          variant="outlined"
          sx={{
            p: 2,
            mb: 1,
            backgroundColor: error ? 'error.light' : 'background.paper',
            borderColor: error ? 'error.main' : 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptedIds.includes(document.id)}
                  onChange={() => handleToggle(document.id)}
                />
              }
              label={
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" component="span">
                      {document.title}
                    </Typography>
                    {document.isRequired && (
                      <Chip
                        label="Obrigatório"
                        size="small"
                        color="primary"
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {document.typeName} - Versão {document.version}
                  </Typography>
                </Box>
              }
              sx={{ flex: 1, alignItems: 'flex-start', mr: 0 }}
            />
            <Button
              startIcon={<VisibilityIcon />}
              size="small"
              onClick={() => setViewingDocument(document)}
            >
              Ler
            </Button>
          </Box>
        </Paper>
      ))}

      {error && helperText && (
        <FormHelperText error sx={{ mt: 1 }}>
          {helperText}
        </FormHelperText>
      )}

      {!allRequiredAccepted && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          * Você deve aceitar todos os documentos obrigatórios para continuar
        </Typography>
      )}

      {viewingDocument && (
        <LegalDocumentViewer
          open={true}
          onClose={() => setViewingDocument(null)}
          title={viewingDocument.title}
          content={viewingDocument.content}
          version={viewingDocument.version}
        />
      )}
    </Box>
  );
}
