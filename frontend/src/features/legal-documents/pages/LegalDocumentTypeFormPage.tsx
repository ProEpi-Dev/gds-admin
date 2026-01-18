import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  FormControlLabel,
  Switch,
  Paper,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useTranslation } from "react-i18next";
import { LegalDocumentsAdminService } from "../../../api/services/legal-documents-admin.service";
import type {
  CreateLegalDocumentTypeDto,
  UpdateLegalDocumentTypeDto,
} from "../../../types/legal-document.types";

export default function LegalDocumentTypeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    isRequired: false,
    active: true,
  });

  // Buscar tipo existente se estiver editando
  const { data: type, isLoading: isLoadingType } = useQuery({
    queryKey: ["legal-document-type", id],
    queryFn: () => LegalDocumentsAdminService.findOneType(Number(id)),
    enabled: isEditing,
  });

  // Preencher formulário com dados do tipo existente
  useEffect(() => {
    if (type && isEditing) {
      setForm({
        code: type.code,
        name: type.name,
        description: type.description || "",
        isRequired: type.isRequired,
        active: type.active,
      });
    }
  }, [type, isEditing]);

  // Mutação para criar
  const createMutation = useMutation({
    mutationFn: (data: CreateLegalDocumentTypeDto) =>
      LegalDocumentsAdminService.createType(data),
    onSuccess: () => {
      snackbar.showSuccess(t("legalDocuments.types.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["legal-document-types-admin-all"] });
      navigate("/legal-documents/types");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        t("legalDocuments.types.createError");
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
      data: UpdateLegalDocumentTypeDto;
    }) => LegalDocumentsAdminService.updateType(id, data),
    onSuccess: () => {
      snackbar.showSuccess(t("legalDocuments.types.updateSuccess"));
      queryClient.invalidateQueries({ queryKey: ["legal-document-types-admin-all"] });
      queryClient.invalidateQueries({ queryKey: ["legal-document-type", id] });
      navigate("/legal-documents/types");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        t("legalDocuments.types.updateError");
      snackbar.showError(message);
    },
  });

  const handleSubmit = () => {
    // Validações
    if (!form.code.trim()) {
      snackbar.showError(t("legalDocuments.types.enterCode"));
      return;
    }
    if (!form.name.trim()) {
      snackbar.showError(t("legalDocuments.types.enterName"));
      return;
    }

    if (isEditing) {
      // Não enviar code ao atualizar (é imutável)
      const { code, ...updateData } = form;
      updateMutation.mutate({
        id: Number(id),
        data: updateData,
      });
    } else {
      createMutation.mutate(form as CreateLegalDocumentTypeDto);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        maxWidth: "900px",
        mx: "auto",
        width: "100%",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
        <IconButton
          onClick={() => navigate("/legal-documents/types")}
          sx={{ mr: 2 }}
          aria-label="voltar"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditing
            ? t("legalDocuments.types.editType")
            : t("legalDocuments.types.newType")}
        </Typography>
      </Box>

      {isLoadingType ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Carregando tipo...</Typography>
        </Box>
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          {/* Código */}
          <TextField
            label={t("legalDocuments.types.code")}
            placeholder="TERMS_OF_USE"
            fullWidth
            margin="normal"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            disabled={isEditing} // Código é imutável após criação
            helperText={isEditing ? "O código não pode ser alterado" : "Use LETRAS_MAIUSCULAS_COM_UNDERLINE"}
            sx={{ mb: 3 }}
          />

          {/* Nome */}
          <TextField
            label={t("legalDocuments.types.name")}
            placeholder="Termos de Uso"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mb: 3 }}
          />

          {/* Descrição */}
          <TextField
            label={t("legalDocuments.types.description")}
            placeholder="Descreva o propósito deste tipo de documento"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            sx={{ mb: 3 }}
          />

          {/* Switches */}
          <Box
            sx={{
              display: "flex",
              gap: 4,
              mb: 3,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={form.isRequired}
                  onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Obrigatório</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Usuários devem aceitar para usar o sistema
                  </Typography>
                </Box>
              }
            />

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
              onClick={() => navigate("/legal-documents/types")}
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
