-- Validação adicional em nível de banco para limiar de síndrome.
ALTER TABLE syndrome
ADD CONSTRAINT ck_syndrome_threshold_score
CHECK (threshold_score >= 0 AND threshold_score <= 1);
