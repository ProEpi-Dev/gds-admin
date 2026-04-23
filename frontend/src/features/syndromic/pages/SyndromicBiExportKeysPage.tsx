import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import BlockIcon from "@mui/icons-material/Block";
import {
  useCreateBiExportApiKey,
  useBiExportApiKeys,
  useRevokeBiExportApiKey,
} from "../hooks/useSyndromicClassification";
import { useSnackbar } from "../../../hooks/useSnackbar";
import { useCurrentContext } from "../../../contexts/CurrentContextContext";
import { formatDateTimeFromApi } from "../../../utils/formatDateOnlyFromApi";
import type { BiExportApiKeyListItem } from "../../../types/syndromic.types";

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Erro na operação";
  const msg = (error as { response?: { data?: { message?: unknown } } }).response?.data
    ?.message;
  return typeof msg === "string" ? msg : "Erro na operação";
}

function CodeBlock({ children }: { children: string }) {
  return (
    <Box
      component="code"
      sx={{
        display: "block",
        px: 1.5,
        py: 1,
        my: 0.5,
        borderRadius: 1,
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "0.8125rem",
        lineHeight: 1.5,
        wordBreak: "break-all",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </Box>
  );
}

export default function SyndromicBiExportKeysPage() {
  const snackbar = useSnackbar();
  const { currentContext } = useCurrentContext();
  const contextId = currentContext?.id ?? null;

  const { data: keys, isLoading } = useBiExportApiKeys(contextId);
  const createMutation = useCreateBiExportApiKey();
  const revokeMutation = useRevokeBiExportApiKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<BiExportApiKeyListItem | null>(null);

  const rows = useMemo(
    () =>
      (keys ?? []).map((k) => ({
        id: k.publicId,
        ...k,
      })),
    [keys],
  );

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Nome",
      flex: 0.9,
      minWidth: 140,
      align: "left",
      headerAlign: "left",
    },
    {
      field: "publicId",
      headerName: "Identificador público",
      flex: 1.2,
      minWidth: 260,
      align: "left",
      headerAlign: "left",
      renderCell: (p) => {
        const v = String(p.value ?? "");
        return (
          <Tooltip title={v}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                lineHeight: 1.4,
                width: "100%",
                alignSelf: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {v}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Criada em",
      width: 168,
      align: "left",
      headerAlign: "left",
      valueGetter: (_v, row) => formatDateTimeFromApi(row.createdAt, "pt-BR"),
    },
    {
      field: "lastUsedAt",
      headerName: "Último uso",
      width: 168,
      align: "left",
      headerAlign: "left",
      valueGetter: (_v, row) =>
        row.lastUsedAt ? formatDateTimeFromApi(row.lastUsedAt, "pt-BR") : "—",
    },
    {
      field: "revokedAt",
      headerName: "Revogada",
      width: 100,
      align: "center",
      headerAlign: "center",
      valueGetter: (_v, row) => (row.revokedAt ? "Sim" : "Não"),
    },
    {
      field: "actions",
      headerName: "Ações",
      width: 88,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const row = params.row as BiExportApiKeyListItem;
        if (row.revokedAt) return null;
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <Tooltip title="Revogar chave">
              <IconButton
                size="small"
                color="warning"
                onClick={() => setRevokeTarget(row)}
                disabled={revokeMutation.isPending}
              >
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  const handleCreate = () => {
    if (!newName.trim()) {
      snackbar.showError("Informe um nome para a chave");
      return;
    }
    if (contextId == null) {
      snackbar.showError("Selecione um contexto na barra superior do aplicativo");
      return;
    }
    createMutation.mutate(
      { contextId, name: newName.trim() },
      {
        onSuccess: (data) => {
          setCreateOpen(false);
          setNewName("");
          setCreatedSecret(data.apiKey);
          setSecretDialogOpen(true);
          snackbar.showSuccess("Chave criada — copie o valor agora; ele não será exibido de novo.");
        },
        onError: (e) => snackbar.showError(getErrorMessage(e)),
      },
    );
  };

  const handleRevoke = () => {
    if (!revokeTarget || contextId == null) return;
    revokeMutation.mutate(
      { publicId: revokeTarget.publicId, contextId: contextId },
      {
        onSuccess: () => {
          snackbar.showSuccess("Chave revogada");
          setRevokeTarget(null);
        },
        onError: (e) => snackbar.showError(getErrorMessage(e)),
      },
    );
  };

  const copySecret = async () => {
    if (!createdSecret) return;
    try {
      await navigator.clipboard.writeText(createdSecret);
      snackbar.showSuccess("Copiado para a área de transferência");
    } catch {
      snackbar.showError("Não foi possível copiar automaticamente");
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: 1120,
        mx: "auto",
        width: "100%",
      }}
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0, flex: 1, maxWidth: { sm: "70%" } }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Chaves de API — export para BI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Gere chaves para o contexto selecionado na barra superior. Cada chave vincula-se a
              esse contexto e autentica o endpoint de exportação JSON.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            disabled={contextId == null}
            sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}
          >
            Nova chave
          </Button>
        </Stack>

        {contextId == null && (
          <Alert severity="info">
            Selecione um contexto no seletor global da barra superior para listar ou criar chaves.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, overflow: "hidden" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Como chamar o endpoint
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Box sx={{ flex: 1, minWidth: 0, maxWidth: { md: "50%" } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                URL (GET)
              </Typography>
              <CodeBlock>
                {`/v1/syndromic-classification/reports/bi-export-scores?startDate=…&endDate=…`}
              </CodeBlock>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>
                  contextId
                </Box>{" "}
                na query é opcional quando a chave já está ligada ao contexto.
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, maxWidth: { md: "50%" } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                Cabeçalho
              </Typography>
              <CodeBlock>x-api-key: publicId.secret</CodeBlock>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                O segredo só aparece uma vez, ao criar a chave. Parâmetro opcional{" "}
                <Box component="span" sx={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>
                  onlySymptoms=true
                </Box>
                : uma linha por relato, só sintomas agregados (sem scores por síndrome).
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            overflow: "hidden",
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": { bgcolor: "action.hover" },
            "& .MuiDataGrid-cell": {
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-columnHeader": {
              display: "flex",
              alignItems: "center",
            },
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            autoHeight
            disableRowSelectionOnClick
            hideFooterSelectedRowCount
            localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            sx={{
              minHeight: rows.length === 0 ? 220 : undefined,
            }}
          />
        </Paper>
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova chave de API</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome (ex.: painel semanal — export sindrômico)"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            Gerar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={secretDialogOpen}
        onClose={() => setSecretDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chave gerada — guarde em local seguro</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta é a única vez em que o segredo completo é exibido. Copie agora para a ferramenta de
            BI (ou outro cliente) ou para um cofre de senhas.
          </Alert>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={createdSecret ?? ""}
            InputProps={{ readOnly: true }}
            sx={{ fontFamily: "monospace" }}
          />
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ContentCopyIcon />} onClick={() => void copySecret()}>
            Copiar
          </Button>
          <Button variant="contained" onClick={() => setSecretDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!revokeTarget} onClose={() => setRevokeTarget(null)}>
        <DialogTitle>Revogar chave?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            A chave <strong>{revokeTarget?.name}</strong> deixará de funcionar imediatamente em todos
            os clientes que a utilizam.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)}>Cancelar</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={handleRevoke}
            disabled={revokeMutation.isPending}
          >
            Revogar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
