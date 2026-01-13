import { useEffect, useState } from "react";
import { TrackService } from "../../api/services/track.service";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, IconButton } from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import DataTable, { type Column } from "../../components/common/DataTable";
import ConfirmDialog from "../../components/common/ConfirmDialog";

interface Track {
  id: number;
  name: string;
  description?: string;
  control_period: boolean;
  start_date?: string;
  end_date?: string;
  show_after_completion: boolean;
}

export default function TrackList() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    TrackService.list().then((res) => {
      setTracks(res.data);
    });
  }, []);

  const handleDelete = (id: number) => {
    setTrackToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (trackToDelete) {
      await TrackService.delete(trackToDelete);
      setTracks((prev) => prev.filter((t) => t.id !== trackToDelete));
      setDeleteDialogOpen(false);
      setTrackToDelete(null);
    }
  };

  const columns: Column<Track>[] = [
    { id: "id", label: "ID", minWidth: 50 },
    { id: "name", label: "Nome", minWidth: 200 },
    { id: "description", label: "Descrição", minWidth: 300 },
    {
      id: "control_period",
      label: "Controla Período",
      minWidth: 150,
      render: (row) => (row.control_period ? "Sim" : "Não"),
    },
    {
      id: "show_after_completion",
      label: "Mostrar Após Conclusão",
      minWidth: 200,
      render: (row) => (row.show_after_completion ? "Sim" : "Não"),
    },
    {
      id: "actions",
      label: "Ações",
      minWidth: 150,
      render: (row) => (
        <Box>
          <IconButton
            onClick={() => navigate(`/tracks/${row.id}/edit`)}
            color="primary"
          >
            <EditIcon />
          </IconButton>
          <IconButton onClick={() => handleDelete(row.id)} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">Trilhas de Conteúdo</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/tracks/new")}
        >
          Nova Trilha
        </Button>
      </Box>

      <DataTable
        data={tracks}
        columns={columns}
        page={1}
        pageSize={20}
        totalItems={tracks.length}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta trilha?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
}
