import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import UserLayout from "../../../components/layout/UserLayout";
import { ContentService } from "../../../api/services/content.service";
import { ContentTypeService } from "../../../api/services/content-type.service";

type ContentItem = {
  id: number;
  title?: string;
  description?: string;
  summary?: string;
  thumbnail_url?: string | null;
  content_type?: {
    id: number;
    name: string;
    color?: string;
  } | null;
};

type ContentTypeOption = {
  id: number;
  name: string;
  color?: string;
};

function resolveDescription(content: ContentItem): string {
  return content.summary?.trim() || content.description?.trim() || "";
}

export default function AppContentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const contextId = user?.participation?.context.id;

  const { data: contents = [], isLoading, error } = useQuery({
    queryKey: ["app-contents", contextId],
    queryFn: async () => {
      const response = await ContentService.list(contextId);
      return response.data as ContentItem[];
    },
    enabled: Boolean(contextId),
  });

  const { data: contentTypes = [] } = useQuery({
    queryKey: ["app-contents", "types"],
    queryFn: async () => {
      const response = await ContentTypeService.list();
      return response.data as ContentTypeOption[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contents.filter((item) => {
      if (typeFilter === "none" && item.content_type) return false;
      if (typeFilter !== "all" && typeFilter !== "none") {
        if (item.content_type?.id !== Number(typeFilter)) return false;
      }

      if (!term) return true;

      const title = item.title?.toLowerCase() ?? "";
      const description = resolveDescription(item).toLowerCase();
      const typeName = item.content_type?.name?.toLowerCase() ?? "";
      return (
        title.includes(term) ||
        description.includes(term) ||
        typeName.includes(term)
      );
    });
  }, [contents, search, typeFilter]);

  return (
    <UserLayout>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          Conteúdos
        </Typography>

        <TextField
          label="Filtrar por texto"
          placeholder="Título, resumo ou tipo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl fullWidth>
          <InputLabel>Tipo de conteúdo</InputLabel>
          <Select
            value={typeFilter}
            label="Tipo de conteúdo"
            onChange={(e) => setTypeFilter(String(e.target.value))}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="none">Sem tipo</MenuItem>
            {contentTypes.map((type) => (
              <MenuItem key={type.id} value={String(type.id)}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isLoading && (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && (
          <Alert severity="error">
            Não foi possível carregar os conteúdos do seu contexto.
          </Alert>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Alert severity="info">Nenhum conteúdo encontrado.</Alert>
        )}

        {filtered.map((content) => (
          <Paper key={content.id} sx={{ p: 2.25 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="h6">
                  {content.title ?? `Conteúdo #${content.id}`}
                </Typography>
                {content.content_type?.name && (
                  <Chip
                    label={content.content_type.name}
                    size="small"
                    sx={{
                      backgroundColor: content.content_type.color || undefined,
                      color: content.content_type.color ? "#fff" : undefined,
                    }}
                  />
                )}
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {content.thumbnail_url ? (
                  <Box
                    component="img"
                    src={content.thumbnail_url}
                    alt={content.title ?? `Thumbnail do conteúdo ${content.id}`}
                    sx={{
                      width: 84,
                      height: 84,
                      borderRadius: 1.5,
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 84,
                      height: 84,
                      borderRadius: 1.5,
                      bgcolor: "grey.100",
                      color: "text.secondary",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: "1px dashed",
                      borderColor: "divider",
                      px: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textAlign: "center", lineHeight: 1.2 }}
                    >
                      Sem imagem
                    </Typography>
                  </Box>
                )}

                <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
                  {resolveDescription(content) && (
                    <Typography variant="body2" color="text.secondary">
                      {resolveDescription(content)}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              <Button
                variant="contained"
                onClick={() => navigate(`/app/conteudos/${content.id}`)}
              >
                Visualizar conteúdo
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </UserLayout>
  );
}
