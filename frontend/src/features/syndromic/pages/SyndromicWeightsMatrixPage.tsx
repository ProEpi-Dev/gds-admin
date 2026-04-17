import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import {
  useSyndromicWeightMatrix,
  useUpsertSyndromicWeightMatrix,
} from "../hooks/useSyndromicClassification";
import { useSnackbar } from "../../../hooks/useSnackbar";
import type { SyndromeWeightMatrix } from "../../../types/syndromic.types";

const HEADER_BG = "#2e7d32";
const FIRST_COL_BG = "#c8e6c9";
const CELL_BORDER = "1px solid #000";

function matrixKey(syndromeId: number, symptomId: number): string {
  return `${syndromeId}:${symptomId}`;
}

function buildWeightMap(data: SyndromeWeightMatrix): Map<string, number> {
  const map = new Map<string, number>();
  for (const cell of data.cells) {
    map.set(matrixKey(cell.syndromeId, cell.symptomId), cell.weight);
  }
  for (const s of data.syndromes) {
    for (const m of data.symptoms) {
      const k = matrixKey(s.id, m.id);
      if (!map.has(k)) {
        map.set(k, 0);
      }
    }
  }
  return map;
}

/**
 * Formata peso como no backend: valores já são "pontos percentuais"
 * (ex.: 0,3 → 0,3%; 13,7 → 13,7%; 24 → 24%).
 */
function formatPercentPt(weight: number): string {
  return `${weight.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })}%`;
}

function formatPercentInputPt(weight: number): string {
  return weight.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

/** Interpreta o que o usuário digitou (com ou sem %) e devolve o mesmo número que o backend guarda. */
function parsePercentToWeight(raw: string): number | null {
  const s = raw.replace(/%/g, "").trim();
  if (s === "") return null;
  let normalized = s.replace(/\s/g, "");
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value) || value < 0) {
    return null;
  }
  return value;
}

function buildPayload(
  data: SyndromeWeightMatrix,
  weights: Map<string, number>,
) {
  const cells: Array<{ syndromeId: number; symptomId: number; weight: number }> = [];
  for (const s of data.syndromes) {
    for (const m of data.symptoms) {
      cells.push({
        syndromeId: s.id,
        symptomId: m.id,
        weight: weights.get(matrixKey(s.id, m.id)) ?? 0,
      });
    }
  }
  return { cells };
}

export default function SyndromicWeightsMatrixPage() {
  const snackbar = useSnackbar();
  const { data, isLoading } = useSyndromicWeightMatrix();
  const saveMutation = useUpsertSyndromicWeightMatrix();

  const [weights, setWeights] = useState<Map<string, number>>(() => new Map());
  const [dirty, setDirty] = useState(false);
  const [focusPos, setFocusPos] = useState<{ row: number; col: number } | null>(null);
  const [editingPos, setEditingPos] = useState<{ row: number; col: number } | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const weightsRef = useRef(weights);
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    weightsRef.current = weights;
  }, [weights]);

  useEffect(() => {
    if (!data || dirty) return;
    const next = buildWeightMap(data);
    weightsRef.current = next;
    setWeights(next);
  }, [data, dirty]);

  const syndromes = data?.syndromes ?? [];
  const symptoms = data?.symptoms ?? [];

  const nCols = syndromes.length;
  const nRows = symptoms.length;

  const beginEdit = useCallback(
    (row: number, col: number) => {
      if (!data || row < 0 || col < 0 || row >= nRows || col >= nCols) return;
      const syndrome = syndromes[col];
      const symptom = symptoms[row];
      if (!syndrome || !symptom) return;
      const w = weightsRef.current.get(matrixKey(syndrome.id, symptom.id)) ?? 0;
      setEditingPos({ row, col });
      setFocusPos({ row, col });
      setEditBuffer(formatPercentInputPt(w));
    },
    [data, nRows, nCols, syndromes, symptoms],
  );

  const commitEdit = useCallback(() => {
    if (!editingPos || !data) {
      setEditingPos(null);
      return;
    }
    const { row, col } = editingPos;
    const syndrome = syndromes[col];
    const symptom = symptoms[row];
    if (!syndrome || !symptom) {
      setEditingPos(null);
      return;
    }
    const key = matrixKey(syndrome.id, symptom.id);
    const parsed = parsePercentToWeight(editBuffer);
    if (parsed === null) {
      snackbar.showError("Valor inválido. Use o mesmo formato do backend (ex.: 0,3 ou 16,4).");
      setEditingPos(null);
      return;
    }
    const prev = weightsRef.current.get(key) ?? 0;
    const rounded = Math.round(parsed * 10000) / 10000;
    if (rounded !== prev) {
      const next = new Map(weightsRef.current);
      next.set(key, rounded);
      weightsRef.current = next;
      setWeights(next);
      setDirty(true);
    }
    setEditingPos(null);
  }, [data, editBuffer, editingPos, snackbar, syndromes, symptoms]);

  const cancelEdit = useCallback(() => {
    setEditingPos(null);
  }, []);

  useEffect(() => {
    if (editingPos && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPos]);

  const moveFocus = useCallback(
    (row: number, col: number) => {
      if (row < 0 || col < 0 || row >= nRows || col >= nCols) return;
      setFocusPos({ row, col });
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(
          `[data-matrix-cell="${row}-${col}"]`,
        );
        el?.focus();
      });
    },
    [nRows, nCols],
  );

  const onDisplayCellKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      if (editingPos) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveFocus(row, Math.min(col + 1, nCols - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveFocus(row, Math.max(col - 1, 0));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus(Math.min(row + 1, nRows - 1), col);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(Math.max(row - 1, 0), col);
      } else if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        beginEdit(row, col);
      } else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        if (col + 1 < nCols) moveFocus(row, col + 1);
        else if (row + 1 < nRows) moveFocus(row + 1, 0);
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (col > 0) moveFocus(row, col - 1);
        else if (row > 0) moveFocus(row - 1, nCols - 1);
      } else if (/^[0-9.,]$/.test(e.key)) {
        e.preventDefault();
        beginEdit(row, col);
        setEditBuffer(e.key);
      }
    },
    [beginEdit, editingPos, moveFocus, nCols, nRows],
  );

  const onEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!editingPos) return;
      const { row, col } = editingPos;
      if (e.key === "Enter") {
        e.preventDefault();
        skipBlurCommitRef.current = true;
        commitEdit();
        moveFocus(Math.min(row + 1, nRows - 1), col);
      } else if (e.key === "Tab") {
        e.preventDefault();
        skipBlurCommitRef.current = true;
        commitEdit();
        if (e.shiftKey) {
          if (col > 0) beginEdit(row, col - 1);
          else if (row > 0) beginEdit(row - 1, nCols - 1);
        } else if (col + 1 < nCols) {
          beginEdit(row, col + 1);
        } else if (row + 1 < nRows) {
          beginEdit(row + 1, 0);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        skipBlurCommitRef.current = true;
        cancelEdit();
      }
    },
    [
      beginEdit,
      cancelEdit,
      commitEdit,
      editingPos,
      moveFocus,
      nCols,
      nRows,
    ],
  );

  const handleSave = async () => {
    if (!data) return;
    try {
      await saveMutation.mutateAsync(buildPayload(data, weightsRef.current));
      setDirty(false);
      snackbar.showSuccess("Matriz de pesos salva com sucesso.");
    } catch {
      snackbar.showError("Não foi possível salvar a matriz. Tente novamente.");
    }
  };

  const tableSx = useMemo(
    () => ({
      borderCollapse: "collapse" as const,
      minWidth: 720,
      "& th, & td": {
        border: CELL_BORDER,
        fontSize: "0.875rem",
      },
      "& thead th, & thead .MuiTableCell-head": {
        backgroundColor: HEADER_BG,
        color: "#fff",
        fontWeight: 700,
        textAlign: "center" as const,
        py: 1,
        px: 0.75,
        position: "sticky" as const,
        top: 0,
        zIndex: 2,
      },
      "& thead th:first-child": {
        textAlign: "left" as const,
        left: 0,
        zIndex: 4,
        minWidth: 220,
        maxWidth: 320,
      },
      /* Primeira coluna é <th scope="row">; :first-of-type em <td> pegava a 1ª síndrome por engano. */
      "& tbody tr > th:first-child": {
        backgroundColor: FIRST_COL_BG,
        fontWeight: 500,
        textAlign: "left" as const,
        position: "sticky" as const,
        left: 0,
        zIndex: 1,
        whiteSpace: "nowrap" as const,
      },
      "& tbody tr > td": {
        backgroundColor: "#fff",
        textAlign: "center" as const,
        p: 0,
        minWidth: 88,
      },
    }),
    [],
  );

  if (isLoading && !data) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data || syndromes.length === 0 || symptoms.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Classificação Sindrômica - Matriz de Pesos
        </Typography>
        <Typography color="text.secondary">
          Não há síndromes ou sintomas ativos para montar a matriz.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h4">Classificação Sindrômica - Matriz de Pesos</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={
            saveMutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          disabled={!dirty || saveMutation.isPending}
          onClick={() => void handleSave()}
        >
          Salvar alterações
        </Button>
      </Box>

      <Paper sx={{ p: 0, overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "calc(100vh - 220px)" }}>
          <Table size="small" stickyHeader sx={tableSx}>
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">
                  Sinais e sintomas
                </TableCell>
                {syndromes.map((s) => (
                  <TableCell key={s.id} component="th" scope="col">
                    {s.name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {symptoms.map((symptom, row) => (
                <TableRow key={symptom.id}>
                  <TableCell component="th" scope="row">
                    {symptom.name}
                  </TableCell>
                  {syndromes.map((syndrome, col) => {
                    const key = matrixKey(syndrome.id, symptom.id);
                    const w = weights.get(key) ?? 0;
                    const isEditing =
                      editingPos?.row === row && editingPos?.col === col;
                    const isFocused =
                      focusPos?.row === row && focusPos?.col === col && !isEditing;

                    return (
                      <TableCell key={key}>
                        {isEditing ? (
                          <TextField
                            inputRef={editInputRef}
                            value={editBuffer}
                            onChange={(e) => setEditBuffer(e.target.value)}
                            onBlur={() => {
                              if (skipBlurCommitRef.current) {
                                skipBlurCommitRef.current = false;
                                return;
                              }
                              commitEdit();
                            }}
                            onKeyDown={onEditKeyDown}
                            variant="standard"
                            size="small"
                            fullWidth
                            InputProps={{
                              sx: {
                                "& input": {
                                  textAlign: "center",
                                  py: 0.5,
                                  fontSize: "0.875rem",
                                },
                              },
                            }}
                          />
                        ) : (
                          <Box
                            data-matrix-cell={`${row}-${col}`}
                            tabIndex={0}
                            onClick={() => {
                              setFocusPos({ row, col });
                              beginEdit(row, col);
                            }}
                            onFocus={() => setFocusPos({ row, col })}
                            onKeyDown={(e) => onDisplayCellKeyDown(e, row, col)}
                            sx={{
                              cursor: "cell",
                              py: 0.75,
                              px: 0.5,
                              outline: isFocused ? "2px solid #1565c0" : "none",
                              outlineOffset: -2,
                            }}
                          >
                            {formatPercentPt(w)}
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Clique na célula para editar. Use Tab / Shift+Tab, Enter (linha abaixo) e setas para
        navegar. Os números são os mesmos do banco (pontos percentuais: 0,3 = 0,3%; 24 = 24%).
      </Typography>
    </Box>
  );
}
