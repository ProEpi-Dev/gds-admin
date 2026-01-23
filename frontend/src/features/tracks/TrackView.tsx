import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { TrackService } from "../../api/services/track.service";

export default function TrackView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState<any>(null);

  useEffect(() => {
    if (id) {
      TrackService.get(Number(id)).then((res) => {
        setTrack(res.data);
      });
    }
  }, [id]);

  if (!track) return null;

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate("/tracks")}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" ml={2}>
          {track.name}
        </Typography>
      </Box>

      {/* Infos gerais */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" mb={2}>
          {track.description || "Sem descrição"}
        </Typography>

        <Box display="flex" flexDirection="column" gap={1}>
          {/* Linha 1 – período */}
          {track.control_period && (
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Chip
                label={`${formatDate(track.start_date)} - ${formatDate(
                  track.end_date,
                )}`}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: "info.main",
                  color: "info.main",
                }}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ lineHeight: 1.4 }}
              >
                A trilha ficará disponível apenas dentro desse período
              </Typography>
            </Box>
          )}

          {/* Linha 2 – pós conclusão */}
          {track.show_after_completion && (
            <Box>
              <Chip
                label="Mostra após conclusão"
                variant="outlined"
                size="small"
                sx={{
                  borderColor: "secondary.main",
                  color: "secondary.main",
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Seções */}
      {track.section?.map((section: any) => (
        <Accordion key={section.id} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">{section.name}</Typography>
          </AccordionSummary>

          <AccordionDetails>
            <List>
              {section.sequence.map((seq: any) => (
                <ListItem key={seq.id}>
                  <ListItemText
                    primary={seq.content?.title || seq.form?.title || "Item"}
                    secondary={
                      seq.content ? "Conteúdo" : seq.form ? "Quiz" : ""
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
