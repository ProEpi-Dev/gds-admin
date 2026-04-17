import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import EditIcon from "@mui/icons-material/Edit";
import DataTable, { type Column } from "../../../components/common/DataTable";
import {
  useCreateSyndromicFormConfig,
  useRemoveSyndromicFormConfig,
  useSyndromicFormConfigs,
  useUpdateSyndromicFormConfig,
} from "../hooks/useSyndromicClassification";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useCurrentContext } from "../../../contexts/CurrentContextContext";
import SelectFormVersion from "../../../components/common/SelectFormVersion";
import type { SyndromeFormConfig } from "../../../types/syndromic.types";

export default function SyndromicFormConfigsPage() {
  const snackbar = useSnackbar();
  const { currentContext } = useCurrentContext();
  const { data: configs, isLoading } = useSyndromicFormConfigs();
  const createMutation = useCreateSyndromicFormConfig();
  const updateMutation = useUpdateSyndromicFormConfig();
  const removeMutation = useRemoveSyndromicFormConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  /** `null` = modal de criação; número = id da config em edição */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [symptomsFieldId, setSymptomsFieldId] = useState("");
  const [symptomsFieldName, setSymptomsFieldName] = useState("");
  const [onsetFieldId, setOnsetFieldId] = useState("");
  const [onsetFieldName, setOnsetFieldName] = useState("");

  const [deactivateTarget, setDeactivateTarget] = useState<SyndromeFormConfig | null>(
    null,
  );

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setSelectedFormId(null);
    setSymptomsFieldId("");
    setSymptomsFieldName("");
    setOnsetFieldId("");
    setOnsetFieldName("");
    setDialogOpen(true);
  };

  const openEdit = (row: SyndromeFormConfig) => {
    setEditingId(row.id);
    setSelectedFormId(row.form_id);
    setSymptomsFieldId(row.symptoms_field_id ?? "");
    setSymptomsFieldName(row.symptoms_field_name ?? "");
    setOnsetFieldId(row.symptom_onset_date_field_id ?? "");
    setOnsetFieldName(row.symptom_onset_date_field_name ?? "");
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const fid = selectedFormId;
    if (fid == null || !Number.isFinite(fid)) {
      return { error: "Selecione um formulário" as const };
    }
    const sid = symptomsFieldId.trim();
    const sname = symptomsFieldName.trim();
    if (!sid && !sname) {
      return {
        error:
          "Informe o ID ou o nome lógico do campo de sintomas (conforme o form_response)" as const,
      };
    }
    return {
      payload: {
        formId: fid,
        ...(sid ? { symptomsFieldId: sid } : {}),
        ...(sname ? { symptomsFieldName: sname } : {}),
        ...(onsetFieldId.trim()
          ? { symptomOnsetDateFieldId: onsetFieldId.trim() }
          : {}),
        ...(onsetFieldName.trim()
          ? { symptomOnsetDateFieldName: onsetFieldName.trim() }
          : {}),
      },
    };
  };

  const handleSave = () => {
    const built = buildPayload();
    if ("error" in built) {
      snackbar.showError(built.error);
      return;
    }
    const { payload } = built;

    if (editingId != null) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            snackbar.showSuccess("Configuração atualizada");
            closeDialog();
          },
          onError: (error: any) =>
            snackbar.showError(
              error?.response?.data?.message ?? "Erro ao atualizar configuração",
            ),
        },
      );
      return;
    }

    createMutation.mutate(
      { ...payload, active: true },
      {
        onSuccess: () => {
          snackbar.showSuccess("Configuração criada");
          closeDialog();
        },
        onError: (error: any) =>
          snackbar.showError(
            error?.response?.data?.message ?? "Erro ao criar configuração",
          ),
      },
    );
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const allRows = configs ?? [];
  const totalItems = allRows.length;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allRows.slice(start, start + pageSize);
  }, [allRows, page, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
    if (page > maxPage) setPage(maxPage);
  }, [totalItems, pageSize, page]);

  const columns: Column<SyndromeFormConfig>[] = [
    { id: "id", label: "ID" },
    { id: "form_id", label: "Form (id)" },
    {
      id: "formulario",
      label: "Formulário",
      render: (row) => {
        const f = row.form;
        if (!f) return "—";
        return f.title + (f.reference ? ` (${f.reference})` : "");
      },
    },
    {
      id: "symptoms_field_id",
      label: "Campo (id)",
      render: (row) => row.symptoms_field_id ?? "—",
    },
    {
      id: "symptoms_field_name",
      label: "Campo (nome)",
      render: (row) => row.symptoms_field_name ?? "—",
    },
    {
      id: "active",
      label: "Ativo",
      render: (row) =>
        row.active ? (
          <Chip label="Sim" size="small" color="success" />
        ) : (
          <Chip label="Não" size="small" />
        ),
    },
    {
      id: "actions",
      label: "Ações",
      render: (row) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => openEdit(row)}
          >
            Editar
          </Button>
          {row.active ? (
            <Button
              size="small"
              color="warning"
              startIcon={<BlockIcon />}
              onClick={() => setDeactivateTarget(row)}
            >
              Desativar
            </Button>
          ) : null}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, display: "grid", gap: 2 }}>
      <Typography variant="h4">Formulários — extração sindrômica</Typography>

      <Alert severity="info">
        <Typography variant="body2" component="span" display="block" gutterBottom>
          Cada <strong>formulário</strong> (todas as versões do mesmo form compartilham a
          configuração) usado em reports positivos precisa de uma configuração ativa que diga{" "}
          <strong>qual campo do form_response</strong> contém os sintomas.
        </Typography>
        <Typography variant="body2" component="span" display="block">
          O motor localiza o campo comparando <code>symptomsFieldId</code> ou{" "}
          <code>symptomsFieldName</code> com as chaves normalizadas em{" "}
          <code>report.form_response</code> (lista <code>answers</code> ou pares campo/valor).
          Em seguida, os valores brutos são mapeados para o catálogo via{" "}
          <strong>mapeamentos valor → sintoma</strong> (API{" "}
          <code>form-symptom-mappings</code> — tela dedicada pode vir depois).
        </Typography>
      </Alert>

      {!currentContext?.id && (
        <Alert severity="warning">
          Sem contexto no cabeçalho, a lista mostra todas as versões disponíveis.
          Para filtrar só os formulários do contexto atual, selecione-o antes.
        </Alert>
      )}

      <Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nova configuração
        </Button>
      </Box>

      <DataTable<SyndromeFormConfig>
        columns={columns}
        data={paginatedRows}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        loading={isLoading}
        variant="cards"
        cardGridTemplateColumns={{
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(3, minmax(0, 1fr))",
        }}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId != null ? "Editar configuração" : "Nova configuração por formulário"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <SelectFormVersion
              contextId={currentContext?.id ?? null}
              value={selectedFormId}
              onChange={(id) => setSelectedFormId(id)}
              required
              label="Formulário"
              valueSource="formId"
              showVersionDatabaseId
            />
            <TextField
              label="ID do campo de sintomas (symptomsFieldId)"
              fullWidth
              helperText="Ex.: id do campo no builder, como aparece em answers[].field"
              value={symptomsFieldId}
              onChange={(e) => setSymptomsFieldId(e.target.value)}
            />
            <TextField
              label="Nome lógico do campo (symptomsFieldName)"
              fullWidth
              helperText="Alternativa ao ID: chave no JSON se não usar id"
              value={symptomsFieldName}
              onChange={(e) => setSymptomsFieldName(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              Preencha pelo menos um dos dois campos acima (ID ou nome).
            </Typography>
            <TextField
              label="ID do campo de data de início dos sintomas (opcional)"
              fullWidth
              value={onsetFieldId}
              onChange={(e) => setOnsetFieldId(e.target.value)}
            />
            <TextField
              label="Nome do campo de data de início (opcional)"
              fullWidth
              value={onsetFieldName}
              onChange={(e) => setOnsetFieldName(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingId != null ? "Salvar alterações" : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
      >
        <DialogTitle>Desativar configuração?</DialogTitle>
        <DialogContent>
          <Typography>
            A configuração #{deactivateTarget?.id} (form_id=
            {deactivateTarget?.form_id}) deixará de ser usada no cálculo.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={removeMutation.isPending}
            onClick={() => {
              if (!deactivateTarget) return;
              removeMutation.mutate(deactivateTarget.id, {
                onSuccess: () => {
                  snackbar.showSuccess("Configuração desativada");
                  setDeactivateTarget(null);
                },
                onError: (error: any) =>
                  snackbar.showError(
                    error?.response?.data?.message ?? "Erro ao desativar",
                  ),
              });
            }}
          >
            Desativar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
