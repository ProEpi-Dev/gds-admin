import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Paper,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "react-i18next";
import { LegalDocumentsAdminService } from "../../../api/services/legal-documents-admin.service";
import RichTextEditor from "../../../components/common/RichTextEditor";
import type {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
} from "../../../types/legal-document.types";

export default function LegalDocumentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState<{
    typeId: number;
    version: string;
    title: string;
    content: string;
    effectiveDate: string;
    active: boolean;
  }>({
    typeId: 0,
    version: "1.0",
    title: "",
    content: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    active: true,
  });

  // Buscar tipos de documentos
  const { data: types, isLoading: isLoadingTypes } = useQuery({
    queryKey: ["legal-document-types-admin"],
    queryFn: () => LegalDocumentsAdminService.findAllTypes(),
  });

  // Buscar documento existente se estiver editando
  const { data: document, isLoading: isLoadingDocument } = useQuery({
    queryKey: ["legal-document", id],
    queryFn: () => LegalDocumentsAdminService.findOneDocument(Number(id)),
    enabled: isEditing,
  });

  // Preencher formulário com dados do documento existente
  useEffect(() => {
    if (document && isEditing) {
      // Só atualizar se realmente mudou (evitar re-renders desnecessários)
      setForm((prevForm) => {
        // Se já tem o typeId correto, não atualizar
        if (prevForm.typeId === document.typeId && prevForm.title === document.title) {
          return prevForm;
        }
        
        return {
          typeId: document.typeId,
          version: document.version,
          title: document.title,
          content: document.content,
          effectiveDate: document.effectiveDate,
          active: document.active,
        };
      });
    }
  }, [document, isEditing]);

  // Mutação para criar
  const createMutation = useMutation({
    mutationFn: (data: CreateLegalDocumentDto) =>
      LegalDocumentsAdminService.createDocument(data),
    onSuccess: () => {
      snackbar.showSuccess(t("legalDocuments.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["legal-documents-admin"] });
      navigate("/legal-documents");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        t("legalDocuments.createError");
      snackbar.showError(message);
    },
  });

  // Mutação para atualizar
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateLegalDocumentDto;
    }) => LegalDocumentsAdminService.updateDocument(id, data),
    onSuccess: () => {
      snackbar.showSuccess(t("legalDocuments.updateSuccess"));
      queryClient.invalidateQueries({ queryKey: ["legal-documents-admin"] });
      queryClient.invalidateQueries({ queryKey: ["legal-document", id] });
      navigate("/legal-documents");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        t("legalDocuments.updateError");
      snackbar.showError(message);
    },
  });

  const handleSubmit = () => {
    // Validações
    if (!form.typeId || form.typeId === 0) {
      snackbar.showError(t("legalDocuments.selectType"));
      return;
    }
    if (!form.title.trim()) {
      snackbar.showError(t("legalDocuments.enterTitle"));
      return;
    }
    if (!form.content.trim()) {
      snackbar.showError(t("legalDocuments.enterContent"));
      return;
    }
    if (!form.version.trim()) {
      snackbar.showError(t("legalDocuments.invalidVersion"));
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: Number(id),
        data: form,
      });
    } else {
      createMutation.mutate(form as CreateLegalDocumentDto);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: "1200px",
        mx: "auto",
        width: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
        <IconButton
          onClick={() => navigate("/legal-documents")}
          sx={{ mr: 2 }}
          aria-label="voltar"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing
            ? t("legalDocuments.editDocument")
            : t("legalDocuments.newDocument")}
        </Typography>
      </Box>

      {isLoadingDocument ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Carregando documento...</Typography>
        </Box>
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          {/* Tipo e Versão */}
          <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
            gap: 3,
            mb: 3,
          }}
        >
          <FormControl fullWidth>
            <InputLabel id="document-type-label">{t("legalDocuments.type")}</InputLabel>
            <Select
              labelId="document-type-label"
              value={form.typeId === 0 ? "" : form.typeId}
              onChange={(e) => {
                const value = e.target.value as string | number;
                setForm({ ...form, typeId: typeof value === 'string' && value === "" ? 0 : Number(value) });
              }}
              label={t("legalDocuments.type")}
              disabled={isLoadingTypes || !types || types.length === 0}
            >
              <MenuItem value="">
                <em>{t("legalDocuments.selectType")}</em>
              </MenuItem>
              {types?.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name} {type.isRequired && "(Obrigatório)"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t("legalDocuments.version")}
            type="text"
            value={form.version}
            onChange={(e) =>
              setForm({ ...form, version: e.target.value })
            }
            placeholder="1.0"
            fullWidth
          />
        </Box>

        {/* Título */}
        <TextField
          label={t("legalDocuments.title")}
          placeholder={t("legalDocuments.enterTitle")}
          fullWidth
          margin="normal"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          sx={{ mb: 3 }}
        />

        {/* Data Efetiva, Obrigatório e Status */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            gap: 3,
            mb: 3,
            alignItems: "center",
          }}
        >
          <TextField
            label={t("legalDocuments.effectiveDate")}
            type="date"
            value={form.effectiveDate}
            onChange={(e) =>
              setForm({ ...form, effectiveDate: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Obrigatoriedade
            </Typography>
            <Chip 
              label={
                types?.find(t => t.id === Number(form.typeId))?.isRequired 
                  ? "Obrigatório" 
                  : "Opcional"
              }
              size="medium"
              color={
                (types?.find(t => t.id === Number(form.typeId))?.isRequired ?? false)
                  ? "error" 
                  : "default"
              }
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              (Definido pelo tipo)
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
            }
            label={t("legalDocuments.active")}
          />
        </Box>

        {/* Conteúdo */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("legalDocuments.content")}
          </Typography>
          <RichTextEditor
            value={form.content}
            onChange={(html) => setForm({ ...form, content: html })}
            placeholder={t("legalDocuments.enterContent")}
            minHeight="500px"
          />
        </Box>

        {/* Botões */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: { xs: "center", sm: "flex-end" },
            mt: 4,
            pt: 3,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            variant="outlined"
            onClick={() => navigate("/legal-documents")}
            sx={{ minWidth: 120 }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            sx={{ minWidth: 120 }}
          >
            {isEditing ? t("common.save") : t("common.create")}
          </Button>
        </Box>
        </Paper>
      )}
    </Box>
  );
}
