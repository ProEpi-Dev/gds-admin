import { useEffect, useState } from "react";
import { TagService } from "../../api/services/tag.service";
import { Chip, Box } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

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
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [color, setColor] = useState("#2196f3");
  const [error, setError] = useState("");

  useEffect(() => {
    TagService.list().then((res) => setTags(res.data));
  }, []);

  const createTag = async () => {
    const trimmed = newTag.trim();

    if (!trimmed) {
      setError("O nome da tag não pode ser vazio.");
      return;
    }

    const alreadyExists = tags.some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      setError("Já existe uma tag com esse nome.");
      return;
    }

    setError("");

    const res = await TagService.create({ name: trimmed, color });
    setTags((prev) => [...prev, res.data]);

    setNewTag("");
  };

  const deleteTag = async (id: number) => {
    await TagService.delete(id);
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* CREATE TAG */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <input
          placeholder="Nova tag"
          value={newTag}
          onChange={(e) => {
            setNewTag(e.target.value);
            if (error) setError("");
          }}
          style={{
            padding: "10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            flex: 1,
          }}
        />

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: 40,
            height: 40,
            cursor: "pointer",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: 0,
          }}
        />

        <button
          onClick={createTag}
          style={{
            padding: "10px 14px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Adicionar
        </button>
      </Box>

      {/* ERROR MESSAGE */}
      {error && (
        <span style={{ color: "red", fontSize: 14, marginTop: -8 }}>
          {error}
        </span>
      )}

      {/* TAG LIST */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {tags.map((tag) => {
          const selected = value.includes(tag.id);

          return (
            <Chip
              key={tag.id}
              label={tag.name}
              onClick={() => {
                if (selected) {
                  onChange(value.filter((t) => t !== tag.id));
                } else {
                  onChange([...value, tag.id]);
                }
              }}
              onDelete={() => deleteTag(tag.id)}
              deleteIcon={<DeleteIcon style={{ color: "white" }} />}
              style={{
                backgroundColor: tag.color || "#888",
                color: "white",
                opacity: selected ? 1 : 0.6,
                fontWeight: 500,
                borderRadius: 6,
                transition: "0.2s",

                border: selected
                  ? "2px solid #4f46e5"
                  : "2px solid transparent",
                boxShadow: selected ? "0 0 6px #4f46e577" : "none",
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
