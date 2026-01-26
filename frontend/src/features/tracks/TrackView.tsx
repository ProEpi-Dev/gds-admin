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
  ListItemButton,
  IconButton,
  Chip,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { TrackService } from "../../api/services/track.service";
import { useLocation } from "react-router-dom";
import { contentService } from "../../api/services/content.service";
import { formsService } from "../../api/services/forms.service";
import { Visibility as VisibilityIcon } from "@mui/icons-material";
import { Tooltip } from "@mui/material";

export default function TrackView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState<any>(null);
  const location = useLocation();
  const [contents, setContents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  useEffect(() => {
    contentService.findAll().then((res) => {
      setContents(res.data);
    });

    formsService.findAll().then((res) => {
      setForms(res.data.filter((f: any) => f.type === "quiz"));
    });
  }, []);

  useEffect(() => {
    if (!id || contents.length === 0) return;

    TrackService.get(Number(id)).then((res) => {
      const normalized = {
        ...res.data,
        section: res.data.section.map((section: any) => ({
          ...section,
          sequence: section.sequence.filter((seq: any) => {
            if (seq.content_id) {
              return contents.some((c) => c.id === seq.content_id);
            }
            if (seq.form_id) {
              return forms.some((f) => f.id === seq.form_id);
            }
            return false;
          }),
        })),
      };

      setTrack(normalized);
    });
  }, [id, contents, forms, location.key]);

  if (!track) {
    return (
      <Box p={4}>
        <Typography color="text.secondary">Carregando trilha…</Typography>
      </Box>
    );
  }

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
              {section.sequence.map((seq: any) => {
                const handleNavigate = () => {
                  if (seq.content_id) {
                    navigate(`/contents/${seq.content_id}/edit`);
                  } else if (seq.form_id) {
                    navigate(`/forms/${seq.form_id}/edit`);
                  }
                };

                return (
                  <ListItem
                    key={seq.id}
                    disablePadding
                    secondaryAction={
                      <Tooltip title="Visualizar">
                        <IconButton
                          edge="end"
                          aria-label="visualizar"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate();
                          }}
                        >
                          <VisibilityIcon
                            color={seq.content_id ? "primary" : "secondary"}
                          />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemButton
                      onClick={handleNavigate}
                      sx={{
                        cursor: "pointer",
                      }}
                    >
                      <ListItemText
                        primary={seq.content?.title || seq.form?.title}
                        secondary={seq.content ? "Conteúdo" : "Quiz"}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
