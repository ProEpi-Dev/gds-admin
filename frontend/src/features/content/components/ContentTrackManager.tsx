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

interface Sequence {
  id: number;
  order: number;
  content_id?: number;
  form_id?: number;
  content?: {
    id: number;
  };
}

interface Section {
  id: number;
  name: string;
  active: boolean;
  sequence?: Sequence[];
}

interface Track {
  id: number;
  name: string;
  active: boolean;
  section?: Section[];
}

interface ContentTrackManagerProps {
  contentId: number;
}

export default function ContentTrackManager({
  contentId,
}: ContentTrackManagerProps) {
  const snackbar = useSnackbar();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
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
        const associatedTracks = allTracksData.filter((track: Track) => {
          const hasContent = track.section?.some((section: Section) =>
            section.sequence?.some(
              (seq: Sequence) => seq.content_id === contentId,
            ),
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

  const handleRemoveAssociation = async (
    trackId: number,
    sectionId: number,
    sequenceId: number,
  ) => {
    try {
      await TrackService.removeSequence(trackId, sectionId, sequenceId);

      snackbar.showSuccess("Conteúdo removido da trilha com sucesso!");

      const allTracksResponse = await TrackService.list();
      const allTracksData = allTracksResponse.data;

      setAllTracks(allTracksData);
      setTracks(
        allTracksData.filter((track: Track) =>
          track.section?.some((section) =>
            section.sequence?.some((seq) => seq.content_id === contentId),
          ),
        ),
      );
    } catch (error) {
      console.error("Erro ao remover associação:", error);
      snackbar.showError("Erro ao remover conteúdo da trilha");
    }
  };

  const handleAssociateContent = async () => {
    if (!selectedTrackId || !selectedSectionId) {
      snackbar.showError("Selecione uma trilha e uma seção");
      return;
    }

    const track = allTracks.find((t) => t.id === selectedTrackId);
    const alreadyExists = track?.section?.some((section) =>
      section.sequence?.some((seq) => seq.content_id === contentId),
    );

    if (alreadyExists) {
      snackbar.showError("Este conteúdo já está nessa trilha");
      return;
    }

    try {
      await TrackService.addContentToSection(
        Number(selectedTrackId),
        Number(selectedSectionId),
        contentId,
      );

      // Fechar modal e resetar seleção primeiro
      setAssociateDialogOpen(false);
      setSelectedTrackId("");
      setSelectedSectionId("");

      // Mostrar notificação de sucesso
      snackbar.showSuccess("Conteúdo adicionado à trilha com sucesso!");

      // Recarregar as trilhas associadas
      const allTracksResponse = await TrackService.list();
      const allTracksData = allTracksResponse.data;
      setAllTracks(allTracksData);
      const associatedTracks = allTracksData.filter((track: Track) => {
        const hasContent = track.section?.some((section: Section) =>
          section.sequence?.some(
            (seq: Sequence) => seq.content_id === contentId,
          ),
        );
        return hasContent;
      });
      setTracks(associatedTracks);
    } catch (error) {
      console.error("Erro ao associar conteúdo:", error);
      snackbar.showError("Erro ao associar conteúdo à trilha");
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
                const matches: { sectionId: number; sequenceId: number }[] = (
                  track.section ?? []
                ).flatMap((section) =>
                  (section.sequence ?? [])
                    .filter((seq) => seq.content_id === contentId)
                    .map((seq) => ({
                      sectionId: section.id,
                      sequenceId: seq.id,
                    })),
                );

                if (matches.length > 1) {
                  console.warn("Conteúdo duplicado na trilha", matches);
                }

                const firstMatch = matches[0];
                if (!firstMatch) {
                  return null;
                }

                const section = track.section?.find(
                  (s) => s.id === firstMatch.sectionId,
                );

                const sequence = section?.sequence?.find(
                  (seq) => seq.id === firstMatch.sequenceId,
                );

                return (
                  <TableRow key={track.id}>
                    <TableCell>{track.name}</TableCell>
                    <TableCell>{section?.name}</TableCell>
                    <TableCell>{sequence?.order}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          if (section && sequence) {
                            handleRemoveAssociation(
                              track.id,
                              section.id,
                              sequence.id,
                            );
                          }
                        }}
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
                  .find((track: Track) => track.id === selectedTrackId)
                  ?.section?.filter((section: Section) => section.active)
                  .map((section: Section) => (
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
