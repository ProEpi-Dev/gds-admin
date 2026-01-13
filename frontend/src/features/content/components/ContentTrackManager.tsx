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
  Chip,
} from "@mui/material";
import { TrackService } from "../../../api/services/track.service";

interface ContentTrackManagerProps {
  contentId: number;
}

export default function ContentTrackManager({
  contentId,
}: ContentTrackManagerProps) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        // Buscar todas as trilhas e filtrar aquelas que contêm este conteúdo
        const allTracks = await TrackService.list();
        console.log("All tracks:", allTracks);
        console.log("Content ID:", contentId);

        // Filtrar trilhas que têm sequences com este content_id
        const associatedTracks = allTracks.filter((track) => {
          const hasContent = track.section?.some((section) =>
            section.sequence?.some((seq) => {
              console.log(
                "Checking sequence:",
                seq,
                "content_id:",
                seq.content_id,
                "target:",
                contentId
              );
              return seq.content_id === contentId;
            })
          );
          console.log("Track", track.name, "has content:", hasContent);
          return hasContent;
        });

        console.log("Associated tracks:", associatedTracks);
        setTracks(associatedTracks);
      } catch (error) {
        console.error("Erro ao carregar trilhas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, [contentId]);

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
      <Typography variant="h6" mb={2}>
        Trilhas Associadas
      </Typography>

      {tracks && tracks.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome da Trilha</TableCell>
                <TableCell>Seção</TableCell>
                <TableCell>Ordem</TableCell>
                <TableCell>Status</TableCell>
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
                      <Chip
                        label={track.active ? "Ativo" : "Inativo"}
                        color={track.active ? "success" : "default"}
                        size="small"
                      />
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
    </Paper>
  );
}
