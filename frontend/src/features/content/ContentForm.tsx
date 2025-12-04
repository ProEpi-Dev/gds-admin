import { useEffect, useState } from "react";
import { ContentService } from "../../api/services/content.service";
import { TagService } from "../../api/services/tag.service";
import { useNavigate, useParams } from "react-router-dom";

export default function ContentForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tags, setTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [slugError, setSlugError] = useState("");

  const [form, setForm] = useState({
    title: "",
    reference: "",
    content: "",
    summary: "",
    slug: "",
    author_id: 1,
    context_id: 1,
    tags: [] as number[],
  });

  useEffect(() => {
    loadTags();
  }, []);

  function loadTags() {
    TagService.list().then((res) => setTags(res.data));
  }

  useEffect(() => {
    if (id) {
      ContentService.get(Number(id)).then((res) => {
        const c = res.data;
        setForm({
          title: c.title,
          reference: c.reference,
          content: c.content,
          summary: c.summary,
          slug: c.slug,
          author_id: c.author_id,
          context_id: c.context_id,
          tags: c.content_tag?.map((t: any) => t.tag_id) || [],
        });
      });
    }
  }, [id]);

  // --------------------- SLUG VALIDATION ------------------------------
  function validateSlug(value: string) {
    const isValid = /^[a-zA-Z0-9-]+$/.test(value);
    setSlugError(
      isValid ? "" : "O slug não pode conter espaços ou caracteres especiais."
    );
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setForm({ ...form, slug: value });
    validateSlug(value);
  }

  // --------------------- CREATE NEW TAG ------------------------------
  async function addNewTag() {
    if (!newTagName.trim()) return;

    const res = await TagService.create({ name: newTagName.trim() });
    const newTag = res.data;

    // adiciona no estado
    setTags((prev) => [...prev, newTag]);

    // marca a nova tag automaticamente
    setForm({
      ...form,
      tags: [...form.tags, newTag.id],
    });

    setNewTagName("");
  }

  // --------------------- SUBMIT ------------------------------
  function handleSubmit() {
    if (slugError) return;

    if (id) {
      ContentService.update(Number(id), form).then(() => navigate("/contents"));
    } else {
      ContentService.create(form).then(() => navigate("/contents"));
    }
  }

  // --------------------- STYLES ------------------------------
  const fieldStyle = {
    display: "flex",
    flexDirection: "column" as const,
    marginBottom: 16,
  };

  const inputStyle = {
    padding: "10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    marginTop: 6,
  };

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h1 style={{ marginBottom: 20 }}>
        {id ? "Editar Conteúdo" : "Criar Conteúdo"}
      </h1>

      {/* TÍTULO */}
      <div style={fieldStyle}>
        <label>Título</label>
        <input
          placeholder="Digite o título do conteúdo"
          style={inputStyle}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      {/* SLUG */}
      <div style={fieldStyle}>
        <label>Slug</label>
        <input
          placeholder="Digite o slug desejado para a página"
          style={inputStyle}
          value={form.slug}
          onChange={handleSlugChange}
        />
        {slugError && (
          <span style={{ color: "red", marginTop: 6 }}>{slugError}</span>
        )}
      </div>

      {/* RESUMO */}
      <div style={fieldStyle}>
        <label>Resumo</label>
        <input
          placeholder="Resumo do conteúdo"
          style={inputStyle}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
      </div>

      {/* CONTEÚDO */}
      <div style={fieldStyle}>
        <label>Conteúdo</label>
        <textarea
          placeholder="Digite ou cole aqui o conteúdo"
          rows={5}
          style={inputStyle}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
      </div>

      {/* TAGS */}
      <div style={fieldStyle}>
        <label>Tags</label>

        {/* SELECT */}
        <select
          multiple
          style={{ ...inputStyle, height: 140 }}
          value={form.tags.map(String)}
          onChange={(e) =>
            setForm({
              ...form,
              tags: Array.from(e.target.selectedOptions).map((o) =>
                Number(o.value)
              ),
            })
          }
        >
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>

        {/* ADD NEW TAG */}
        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <input
            placeholder="Criar nova tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={addNewTag}
            style={{
              padding: "10px 16px",
              background: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            + Adicionar
          </button>
        </div>
      </div>

      {/* BOTÃO SUBMIT */}
      <button
        style={{
          marginTop: 20,
          background: slugError ? "#888" : "#1976d2",
          color: "white",
          padding: "10px 16px",
          border: "none",
          borderRadius: 6,
          cursor: slugError ? "not-allowed" : "pointer",
          fontWeight: 500,
        }}
        disabled={!!slugError}
        onClick={handleSubmit}
      >
        {id ? "Salvar" : "Criar"}
      </button>
    </div>
  );
}
