import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorAlert from "../../../components/common/ErrorAlert";
import { useTranslation } from "../../../hooks/useTranslation";
import { useRaceColor } from "../hooks/useRaceColors";

export default function RaceColorViewPage() {
  const { id } = useParams<{ id: string }>();
  const raceColorId = id ? parseInt(id, 10) : null;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: raceColor, isLoading, error } = useRaceColor(raceColorId);

  if (isLoading) return <LoadingSpinner />;
  if (error || !raceColor)
    return <ErrorAlert message={t("raceColors.errorLoading")} />;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {t("raceColors.title")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/race-colors")}
          >
            {t("common.back")}
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/race-colors/${raceColorId}/edit`)}
          >
            {t("common.edit")}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t("raceColors.name")}
            </Typography>
            <Typography variant="body1">{raceColor.name}</Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t("raceColors.status")}
            </Typography>
            <Chip
              label={
                raceColor.active
                  ? t("raceColors.active")
                  : t("raceColors.inactive")
              }
              color={raceColor.active ? "success" : "default"}
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t("common.createdAt")}
            </Typography>
            <Typography variant="body1">
              {new Date(raceColor.createdAt).toLocaleString("pt-BR")}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t("common.updatedAt")}
            </Typography>
            <Typography variant="body1">
              {new Date(raceColor.updatedAt).toLocaleString("pt-BR")}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
