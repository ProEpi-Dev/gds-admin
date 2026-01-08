import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";
import FormBuilder from "../../../components/form-builder/FormBuilder";
import FormDefinitionJsonEditor from "./FormDefinitionJsonEditor";
import {
  ensureFormDefinition,
  formatDefinition,
  validateFormDefinition,
} from "../utils/formDefinitionValidator";
import type { FormBuilderDefinition } from "../../../types/form-builder.types";

const formSchema = z.object({
  accessType: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  active: z.boolean().optional(),
  // Campos específicos de quiz
  passingScore: z.number().min(0).max(100).nullable().optional(),
  maxAttempts: z.number().min(1).nullable().optional(),
  timeLimitMinutes: z.number().min(1).nullable().optional(),
  showFeedback: z.boolean().optional(),
  randomizeQuestions: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FormVersionEditorProps {
  initialDefinition?: FormBuilderDefinition;
  initialAccessType?: "PUBLIC" | "PRIVATE";
  initialActive?: boolean;
  formType?: "quiz" | "signal";
  // Campos específicos de quiz
  initialPassingScore?: number | null;
  initialMaxAttempts?: number | null;
  initialTimeLimitMinutes?: number | null;
  initialShowFeedback?: boolean;
  initialRandomizeQuestions?: boolean;
  onSubmit: (data: {
    accessType?: "PUBLIC" | "PRIVATE";
    active?: boolean;
    definition: FormBuilderDefinition;
    // Campos específicos de quiz
    passingScore?: number | null;
    maxAttempts?: number | null;
    timeLimitMinutes?: number | null;
    showFeedback?: boolean;
    randomizeQuestions?: boolean;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  title?: string;
  showNewVersionWarning?: boolean;
  nextVersionNumber?: number;
  currentVersionNumber?: number;
  onDefinitionChange?: (definition: FormBuilderDefinition) => void;
}

export default function FormVersionEditor({
  initialDefinition,
  initialAccessType,
  initialActive,
  formType,
  initialPassingScore,
  initialMaxAttempts,
  initialTimeLimitMinutes,
  initialShowFeedback,
  initialRandomizeQuestions,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Salvar",
  title,
  showNewVersionWarning = false,
  nextVersionNumber,
  currentVersionNumber,
  onDefinitionChange,
}: FormVersionEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<FormBuilderDefinition>(
    initialDefinition || { fields: [] }
  );
  const [activeEditor, setActiveEditor] = useState<"builder" | "json">(
    "builder"
  );
  const [jsonValue, setJsonValue] = useState(
    formatDefinition(initialDefinition || { fields: [] })
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accessType: initialAccessType,
      active: initialActive,
      passingScore: initialPassingScore ?? null,
      maxAttempts: initialMaxAttempts ?? null,
      timeLimitMinutes: initialTimeLimitMinutes ?? null,
      showFeedback: initialShowFeedback ?? true,
      randomizeQuestions: initialRandomizeQuestions ?? false,
    },
  });

  useEffect(() => {
    if (initialDefinition) {
      const normalizedDefinition = ensureFormDefinition(initialDefinition);
      setDefinition(normalizedDefinition);
      setJsonValue(formatDefinition(normalizedDefinition));
      setJsonError(null);
    }
    reset({
      accessType: initialAccessType,
      active: initialActive,
      passingScore: initialPassingScore ?? null,
      maxAttempts: initialMaxAttempts ?? null,
      timeLimitMinutes: initialTimeLimitMinutes ?? null,
      showFeedback: initialShowFeedback ?? true,
      randomizeQuestions: initialRandomizeQuestions ?? false,
    });
  }, [initialDefinition, initialAccessType, initialActive, reset]);

  const handleBuilderChange = useCallback(
    (nextDefinition: FormBuilderDefinition) => {
      setDefinition(nextDefinition);
      setJsonValue(formatDefinition(nextDefinition));
      setJsonError(null);
      onDefinitionChange?.(nextDefinition);
    },
    [onDefinitionChange]
  );

  const handleJsonChange = useCallback(
    (value: string) => {
      setJsonValue(value);

      if (!value.trim()) {
        setJsonError("O JSON não pode estar vazio");
        return;
      }

      try {
        const parsed = JSON.parse(value);
        const validation = validateFormDefinition(parsed);

        if (!validation.valid) {
          const errorMessages = Array.isArray(validation.errors)
            ? validation.errors
            : ["JSON inválido"];
          setJsonError(errorMessages.join("\n"));
          return;
        }

        setJsonError(null);
        setDefinition(validation.definition);
        onDefinitionChange?.(validation.definition);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Erro desconhecido ao processar JSON";
        setJsonError(`JSON inválido: ${errorMessage}`);
      }
    },
    [onDefinitionChange]
  );

  const handleFormSubmit = (data: FormData) => {
    if (jsonError) {
      setError("Corrija o JSON antes de salvar");
      return;
    }

    if (definition.fields.length === 0) {
      setError("Adicione pelo menos um campo ao formulário");
      return;
    }

    setError(null);
    onSubmit({
      accessType: data.accessType,
      active: data.active,
      definition: definition,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      timeLimitMinutes: data.timeLimitMinutes,
      showFeedback: data.showFeedback,
      randomizeQuestions: data.randomizeQuestions,
    });
  };

  return (
    <Box>
      {title && (
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
      )}

      <Box component="form" onSubmit={handleSubmit(handleFormSubmit)}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 3 }}>
          <FormControl error={!!errors.accessType} sx={{ maxWidth: 300 }}>
            <InputLabel id="access-type-label">Tipo de Acesso</InputLabel>
            <Controller
              name="accessType"
              control={control}
              render={({ field }) => (
                <Select
                  labelId="access-type-label"
                  label="Tipo de Acesso"
                  value={field.value || initialAccessType || ""}
                  onChange={(e) => {
                    const value = e.target.value as 'PUBLIC' | 'PRIVATE' | '';
                    field.onChange(value === '' ? undefined : (value as 'PUBLIC' | 'PRIVATE'));
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                >
                  <MenuItem value="PUBLIC">Público</MenuItem>
                  <MenuItem value="PRIVATE">Privado</MenuItem>
                </Select>
              )}
            />
            {errors.accessType && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 0.5, ml: 1.75 }}
              >
                {errors.accessType.message}
              </Typography>
            )}
          </FormControl>

          {formType === 'quiz' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Configurações do Quiz
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Controller
                  name="passingScore"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Nota mínima para aprovação (%)"
                      type="number"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value);
                        field.onChange(value);
                      }}
                      onBlur={field.onBlur}
                      error={!!errors.passingScore}
                      helperText={errors.passingScore?.message || 'Deixe vazio para exigir 100% de acerto'}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      sx={{ maxWidth: 300 }}
                    />
                  )}
                />

                <Controller
                  name="maxAttempts"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Número máximo de tentativas"
                      type="number"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value);
                        field.onChange(value);
                      }}
                      onBlur={field.onBlur}
                      error={!!errors.maxAttempts}
                      helperText={errors.maxAttempts?.message || 'Deixe vazio para permitir tentativas ilimitadas'}
                      inputProps={{ min: 1 }}
                      sx={{ maxWidth: 300 }}
                    />
                  )}
                />

                <Controller
                  name="timeLimitMinutes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Tempo limite (minutos)"
                      type="number"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value);
                        field.onChange(value);
                      }}
                      onBlur={field.onBlur}
                      error={!!errors.timeLimitMinutes}
                      helperText={errors.timeLimitMinutes?.message || 'Deixe vazio para sem limite de tempo'}
                      inputProps={{ min: 1 }}
                      sx={{ maxWidth: 300 }}
                    />
                  )}
                />

                <Controller
                  name="showFeedback"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value ?? true}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      }
                      label="Mostrar feedback após resposta"
                    />
                  )}
                />

                <Controller
                  name="randomizeQuestions"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value ?? false}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                        />
                      }
                      label="Randomizar ordem das questões"
                    />
                  )}
                />
              </Box>
            </>
          )}

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Definição do Formulário
            </Typography>

            <Tabs
              value={activeEditor}
              onChange={(_, value) =>
                setActiveEditor(value as "builder" | "json")
              }
              sx={{ mb: 2 }}
              aria-label="Alternar modo de edição do formulário"
            >
              <Tab label="Construtor visual" value="builder" />
              <Tab label="Editor JSON" value="json" />
            </Tabs>

            {activeEditor === "builder" ? (
              <FormBuilder
                definition={definition}
                onChange={handleBuilderChange}
                formType={formType}
              />
            ) : (
              <FormDefinitionJsonEditor
                value={jsonValue}
                onChange={handleJsonChange}
                error={jsonError}
              />
            )}
          </Box>

          {showNewVersionWarning &&
            nextVersionNumber &&
            currentVersionNumber && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "medium", mb: 0.5 }}
                >
                  Nova versão será criada
                </Typography>
                <Typography variant="body2">
                  Ao salvar, será criada uma nova versão do formulário (versão{" "}
                  {nextVersionNumber}). A versão atual ({currentVersionNumber})
                  será mantida e não será alterada.
                </Typography>
              </Alert>
            )}

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button type="submit" variant="contained" disabled={isLoading}>
              {isLoading ? <CircularProgress size={24} /> : submitLabel}
            </Button>
            <Button variant="outlined" onClick={onCancel}>
              Cancelar
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
