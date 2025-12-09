import { useEffect, useState } from "react";
import { ContentService } from "../../api/services/content.service";
import { useNavigate, useParams } from "react-router-dom";
import TagSelector from "../../../src/components/common/TagSelector";

export default function ContentForm() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  // LOAD CONTENT IF EDIT
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
          tags: c.content_tag?.map((t: any) => t.tag.id) || [],
        });
      });
    }
  }, [id]);

  // SLUG VALIDATION
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

  // SUBMIT
  function handleSubmit() {
    if (slugError) return;

    if (id) {
      // Edição
      ContentService.update(Number(id), form).then(() => navigate("/contents"));
    } else {
      // Criação
      const newContent = {
        ...form,
        reference: form.reference || `ref-${Date.now()}`, // se reference vazio, cria um único
      };

      ContentService.create(newContent)
        .then(() => navigate("/contents"))
        .catch((error) => {
          alert(
            "Erro ao criar conteúdo: " +
              (error.response?.data?.message || error.message)
          );
        });
    }
  }

  // STYLES
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

        <TagSelector
          value={form.tags}
          onChange={(newTags: number[]) => setForm({ ...form, tags: newTags })}
        />
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
