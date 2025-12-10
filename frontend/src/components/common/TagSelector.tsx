import { useEffect, useState } from "react";
import { TagService } from "../../api/services/tag.service";
import { useTranslation } from "../../hooks/useTranslation";
import {
  Chip,
  Box,
  TextField,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface Tag {
  id: number;
  name: string;
  color?: string;
}

export default function TagSelector({
  value,
  onChange,
}: {
  value: number[];
  onChange: (tags: number[]) => void;
}) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#2196f3");

  useEffect(() => {
    TagService.list().then((res) => setTags(res.data));
  }, []);

  // Sync selected tags with value prop
  useEffect(() => {
    const selected = tags.filter((tag) => value.includes(tag.id));
    setSelectedTags(selected);
  }, [value, tags]);

  const handleChange = (_event: any, newValue: (Tag | string)[]) => {
    // Check if user is trying to create a new tag
    const lastItem = newValue[newValue.length - 1];
    
    if (typeof lastItem === "string") {
      // User typed a new tag name
      setNewTagName(lastItem);
      setCreateDialogOpen(true);
      return;
    }

    // Update selected tags
    const tagObjects = newValue.filter((item): item is Tag => typeof item !== "string");
    setSelectedTags(tagObjects);
    onChange(tagObjects.map((tag) => tag.id));
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    
    if (!trimmed) {
      setCreateDialogOpen(false);
      return;
    }

    try {
      const res = await TagService.create({ name: trimmed, color: newTagColor });
      const newTag = res.data;
      
      // Add to tags list
      setTags((prev) => [...prev, newTag]);
      
      // Add to selected tags
      const updatedSelected = [...selectedTags, newTag];
      setSelectedTags(updatedSelected);
      onChange(updatedSelected.map((tag) => tag.id));
      
      // Reset
      setCreateDialogOpen(false);
      setNewTagName("");
      setNewTagColor("#2196f3");
      setInputValue("");
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  const handleCancelCreate = () => {
    setCreateDialogOpen(false);
    setNewTagName("");
    setNewTagColor("#2196f3");
    setInputValue("");
  };

  return (
    <Box>
      <Autocomplete
        multiple
        freeSolo
        options={tags}
        value={selectedTags}
        inputValue={inputValue}
        onInputChange={(_event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        onChange={handleChange}
        getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={option.name}
              size="small"
              sx={{
                backgroundColor: option.color || "#888",
                color: "#fff",
              }}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selectedTags.length === 0 ? t('tags.searchPlaceholder') : ""}
            size="small"
            helperText={t('tags.searchHelperText')}
          />
        )}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Chip
              label={option.name}
              size="small"
              sx={{
                backgroundColor: option.color || "#888",
                color: "#fff",
                mr: 1,
              }}
            />
            {option.name}
          </li>
        )}
      />

      {/* Create Tag Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCancelCreate} maxWidth="xs" fullWidth>
        <DialogTitle>{t('tags.createTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label={t('tags.nameLabel')}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              fullWidth
              autoFocus
              size="small"
            />
            
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('tags.colorLabel')}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Box
                  component="input"
                  type="color"
                  value={newTagColor}
                  onChange={(e: any) => setNewTagColor(e.target.value)}
                  sx={{
                    width: 60,
                    height: 40,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    padding: 0.5,
                  }}
                />
                <Chip
                  label={newTagName || t('tags.preview')}
                  size="small"
                  sx={{
                    backgroundColor: newTagColor,
                    color: "#fff",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCreate}>{t('common.cancel')}</Button>
          <Button onClick={handleCreateTag} variant="contained" disabled={!newTagName.trim()}>
            {t('tags.createAndAdd')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
