import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { TrackService } from "../../../api/services/track.service";
import { useSnackbar } from "../../../hooks/useSnackbar";

interface ContentTrackManagerProps {
  contentId: number;
}

export default function ContentTrackManager({
  contentId,
}: ContentTrackManagerProps) {
  const snackbar = useSnackbar();
  const [tracks, setTracks] = useState<any[]>([]);
  const [allTracks, setAllTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [associateDialogOpen, setAssociateDialogOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<number | "">("");
  const [selectedSectionId, setSelectedSectionId] = useState<number | "">("");

  useEffect(() => {
    const loadTracks = async () => {
      try {
        // Buscar todas as trilhas
        const allTracksResponse = await TrackService.list();
        const allTracksData = allTracksResponse.data;
        setAllTracks(allTracksData);

        // Filtrar trilhas que têm sequences com este content_id
        const associatedTracks = allTracksData.filter((track) => {
          const hasContent = track.section?.some((section) =>
            section.sequence?.some((seq) => seq.content_id === contentId)
          );
          return hasContent;
        });

        setTracks(associatedTracks);
      } catch (error) {
        console.error("Erro ao carregar trilhas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, [contentId]);

  const handleAssociateContent = async () => {
    if (!selectedTrackId || !selectedSectionId) {
      snackbar.showError("Selecione uma trilha e uma seção");
      return;
    }

    try {
      await TrackService.addContentToSection(
        Number(selectedTrackId),
        Number(selectedSectionId),
        contentId
      );
      snackbar.showSuccess("Conteúdo associado à trilha com sucesso!");

      // Recarregar as trilhas associadas
      const allTracksResponse = await TrackService.list();
      const allTracksData = allTracksResponse.data;
      setAllTracks(allTracksData);
      const associatedTracks = allTracksData.filter((track) => {
        const hasContent = track.section?.some((section) =>
          section.sequence?.some((seq) => seq.content_id === contentId)
        );
        return hasContent;
      });
      setTracks(associatedTracks);

      // Fechar modal e resetar seleção
      setAssociateDialogOpen(false);
      setSelectedTrackId("");
      setSelectedSectionId("");
    } catch (error) {
      console.error("Erro ao associar conteúdo:", error);
      snackbar.showError("Erro ao associar conteúdo à trilha");
    }
  };

  const handleRemoveAssociation = async (
    trackId: number,
    sectionId: number
  ) => {
    try {
      // Para remover, precisamos encontrar a sequence e removê-la
      // Como não temos endpoint específico, vamos recarregar a página ou implementar uma solução
      // Por enquanto, vamos mostrar uma mensagem
      snackbar.showInfo(
        "Para remover a associação, edite a trilha diretamente"
      );
    } catch (error) {
      console.error("Erro ao remover associação:", error);
      snackbar.showError("Erro ao remover associação");
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>
          Trilhas Associadas
        </Typography>
        <Typography>Carregando...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Trilhas Associadas</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAssociateDialogOpen(true)}
          size="small"
        >
          Associar Trilha
        </Button>
      </Box>

      {tracks && tracks.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome da Trilha</TableCell>
                <TableCell>Seção</TableCell>
                <TableCell>Ordem</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tracks.map((track) => {
                // Encontrar a seção e sequence que contém este conteúdo
                const section = track.section?.find((section) =>
                  section.sequence?.some((seq) => seq.content_id === contentId)
                );
                const sequence = section?.sequence?.find(
                  (seq) => seq.content_id === contentId
                );

                return (
                  <TableRow key={track.id}>
                    <TableCell>{track.name}</TableCell>
                    <TableCell>{section?.name}</TableCell>
                    <TableCell>{sequence?.order}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleRemoveAssociation(track.id, section.id)
                        }
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary">
          Este conteúdo não está associado a nenhuma trilha.
        </Typography>
      )}

      {/* Modal para associar trilha */}
      <Dialog
        open={associateDialogOpen}
        onClose={() => setAssociateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Associar Conteúdo à Trilha</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Selecione uma Trilha</InputLabel>
            <Select
              value={selectedTrackId}
              onChange={(e) => {
                setSelectedTrackId(e.target.value as number);
                setSelectedSectionId(""); // Reset section when track changes
              }}
              label="Selecione uma Trilha"
            >
              {allTracks
                .filter((track) => track.active) // Only show active tracks
                .map((track) => (
                  <MenuItem key={track.id} value={track.id}>
                    {track.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {selectedTrackId && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Selecione uma Seção</InputLabel>
              <Select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value as number)}
                label="Selecione uma Seção"
              >
                {allTracks
                  .find((track) => track.id === selectedTrackId)
                  ?.section?.filter((section) => section.active)
                  .map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssociateDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssociateContent}
            variant="contained"
            disabled={!selectedTrackId || !selectedSectionId}
          >
            Associar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
