-- Seed inicial de limiares (threshold_score) por síndrome.
-- Valores em escala 0..1 (ex.: 36% = 0.36).

UPDATE syndrome
SET
  threshold_score = seed.threshold_score,
  active = true,
  updated_at = CURRENT_TIMESTAMP
FROM (
  VALUES
    ('gripal', 0.36::numeric),
    ('diarreica', 0.33::numeric),
    ('exantematica', 0.27::numeric),
    ('hemorragica', 0.24::numeric),
    ('conjuntivite', 0.55::numeric),
    ('infeccao_urinaria', 0.41::numeric),
    ('ist', 0.27::numeric)
) AS seed(code, threshold_score)
WHERE syndrome.code = seed.code;
