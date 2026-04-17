-- Seed inicial de sindromes, sintomas e pesos da matriz sindromica.
-- Valores de peso conforme tabela fornecida (em pontos percentuais).

INSERT INTO syndrome (code, name, description, active)
VALUES
  ('gripal', 'Gripal', 'Seed inicial de pesos para síndrome gripal', true),
  ('diarreica', 'Diarreica', 'Seed inicial de pesos para síndrome diarreica', true),
  ('exantematica', 'Exantemática', 'Seed inicial de pesos para síndrome exantemática', true),
  ('hemorragica', 'Hemorrágica', 'Seed inicial de pesos para síndrome hemorrágica', true),
  ('conjuntivite', 'Conjuntivite', 'Seed inicial de pesos para síndrome de conjuntivite', true),
  ('infeccao_urinaria', 'Infec. Urinária', 'Seed inicial de pesos para síndrome de infecção urinária', true),
  ('ist', 'IST', 'Seed inicial de pesos para síndrome IST', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = true,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO symptom (code, name, description, active)
VALUES
  ('febre', 'Febre', NULL, true),
  ('dor_garganta', 'Dor de garganta', NULL, true),
  ('dor_cabeca', 'Dor de cabeça', NULL, true),
  ('mal_estar_enjoo', 'Mal-estar / enjoo', NULL, true),
  ('tosse', 'Tosse', NULL, true),
  ('coriza', 'Coriza', NULL, true),
  ('dores_corpo', 'Dores no corpo', NULL, true),
  ('dor_atras_olhos', 'Dor atrás dos olhos', NULL, true),
  ('coceira_corpo', 'Coceira no corpo', NULL, true),
  ('fraqueza_tontura', 'Fraqueza ou Tontura', NULL, true),
  ('ganglios_linfaticos_inchados', 'Gânglios linfáticos inchados', NULL, true),
  ('manchas_vermelhas_corpo', 'Manchas vermelhas no corpo', NULL, true),
  ('dor_abdominal', 'Dor abdominal', NULL, true),
  ('sangue_muco_fezes', 'Sangue ou muco nas fezes', NULL, true),
  ('nausea_vomitos', 'Náusea e Vômitos', NULL, true),
  ('diarreia', 'Diarréia', NULL, true),
  ('diminuicao_apetite', 'Diminuição do apetite', NULL, true),
  ('olhos_vermelhos_lacrimejantes', 'Olhos vermelhos e lacrimejantes', NULL, true),
  ('dor_ardencia_urinar', 'Dor ou ardência ao urinar', NULL, true),
  ('bolhas_espinhas_descamacao_pele', 'Bolhas, espinhas  ou descamação da pele', NULL, true),
  ('sangramento_olhos_gengiva_nariz', 'Sangramento nos olhos, gengiva ou nariz', NULL, true),
  ('urina_turva', 'Urina turva', NULL, true),
  ('ferida_verruga_genital', 'Ferida ou verruga genital', NULL, true),
  ('corrimento_genital', 'Corrimento genital', NULL, true),
  ('ardencia_coceira_olhos', 'Ardência e coceira nos olhos', NULL, true),
  ('dor_sangramento_relacao_sexual', 'Dor ou Sangramento na relação sexual', NULL, true),
  ('sangramento_urina', 'Sangramento na urina', NULL, true),
  ('coceira_regiao_genital', 'Coceira na região genital', NULL, true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  active = true,
  updated_at = CURRENT_TIMESTAMP;

WITH seed(symptom_code, syndrome_code, weight) AS (
  VALUES
    ('febre', 'gripal', 16.4), ('febre', 'diarreica', 4.1), ('febre', 'exantematica', 15.5), ('febre', 'hemorragica', 12.0), ('febre', 'conjuntivite', 4.1), ('febre', 'infeccao_urinaria', 7.6), ('febre', 'ist', 2.2),
    ('dor_garganta', 'gripal', 13.7), ('dor_garganta', 'diarreica', 0.5), ('dor_garganta', 'exantematica', 4.9), ('dor_garganta', 'hemorragica', 1.3), ('dor_garganta', 'conjuntivite', 2.5), ('dor_garganta', 'infeccao_urinaria', 0.8), ('dor_garganta', 'ist', 1.6),
    ('dor_cabeca', 'gripal', 9.3), ('dor_cabeca', 'diarreica', 1.6), ('dor_cabeca', 'exantematica', 4.9), ('dor_cabeca', 'hemorragica', 5.1), ('dor_cabeca', 'conjuntivite', 4.9), ('dor_cabeca', 'infeccao_urinaria', 0.4), ('dor_cabeca', 'ist', 0.4),
    ('mal_estar_enjoo', 'gripal', 4.4), ('mal_estar_enjoo', 'diarreica', 8.8), ('mal_estar_enjoo', 'exantematica', 5.7), ('mal_estar_enjoo', 'hemorragica', 3.4), ('mal_estar_enjoo', 'conjuntivite', 0.4), ('mal_estar_enjoo', 'infeccao_urinaria', 1.5), ('mal_estar_enjoo', 'ist', 0.4),
    ('tosse', 'gripal', 19.2), ('tosse', 'diarreica', 0.3), ('tosse', 'exantematica', 1.6), ('tosse', 'hemorragica', 0.2), ('tosse', 'conjuntivite', 0.4), ('tosse', 'infeccao_urinaria', 0.4), ('tosse', 'ist', 0.2),
    ('coriza', 'gripal', 14.5), ('coriza', 'diarreica', 0.3), ('coriza', 'exantematica', 2.0), ('coriza', 'hemorragica', 0.2), ('coriza', 'conjuntivite', 0.4), ('coriza', 'infeccao_urinaria', 0.4), ('coriza', 'ist', 0.2),
    ('dores_corpo', 'gripal', 8.5), ('dores_corpo', 'diarreica', 2.3), ('dores_corpo', 'exantematica', 5.3), ('dores_corpo', 'hemorragica', 4.6), ('dores_corpo', 'conjuntivite', 2.9), ('dores_corpo', 'infeccao_urinaria', 3.0), ('dores_corpo', 'ist', 2.2),
    ('dor_atras_olhos', 'gripal', 0.5), ('dor_atras_olhos', 'diarreica', 1.8), ('dor_atras_olhos', 'exantematica', 3.7), ('dor_atras_olhos', 'hemorragica', 4.6), ('dor_atras_olhos', 'conjuntivite', 2.9), ('dor_atras_olhos', 'infeccao_urinaria', 2.7), ('dor_atras_olhos', 'ist', 1.6),
    ('coceira_corpo', 'gripal', 0.3), ('coceira_corpo', 'diarreica', 0.3), ('coceira_corpo', 'exantematica', 7.8), ('coceira_corpo', 'hemorragica', 1.3), ('coceira_corpo', 'conjuntivite', 0.4), ('coceira_corpo', 'infeccao_urinaria', 0.8), ('coceira_corpo', 'ist', 2.2),
    ('fraqueza_tontura', 'gripal', 2.7), ('fraqueza_tontura', 'diarreica', 4.7), ('fraqueza_tontura', 'exantematica', 4.9), ('fraqueza_tontura', 'hemorragica', 6.7), ('fraqueza_tontura', 'conjuntivite', 0.4), ('fraqueza_tontura', 'infeccao_urinaria', 0.8), ('fraqueza_tontura', 'ist', 0.4),
    ('ganglios_linfaticos_inchados', 'gripal', 0.3), ('ganglios_linfaticos_inchados', 'diarreica', 0.3), ('ganglios_linfaticos_inchados', 'exantematica', 2.9), ('ganglios_linfaticos_inchados', 'hemorragica', 1.3), ('ganglios_linfaticos_inchados', 'conjuntivite', 2.9), ('ganglios_linfaticos_inchados', 'infeccao_urinaria', 0.4), ('ganglios_linfaticos_inchados', 'ist', 6.7),
    ('manchas_vermelhas_corpo', 'gripal', 0.3), ('manchas_vermelhas_corpo', 'diarreica', 1.8), ('manchas_vermelhas_corpo', 'exantematica', 11.8), ('manchas_vermelhas_corpo', 'hemorragica', 7.6), ('manchas_vermelhas_corpo', 'conjuntivite', 4.5), ('manchas_vermelhas_corpo', 'infeccao_urinaria', 0.4), ('manchas_vermelhas_corpo', 'ist', 5.8),
    ('dor_abdominal', 'gripal', 0.3), ('dor_abdominal', 'diarreica', 14.0), ('dor_abdominal', 'exantematica', 2.2), ('dor_abdominal', 'hemorragica', 3.4), ('dor_abdominal', 'conjuntivite', 2.9), ('dor_abdominal', 'infeccao_urinaria', 4.2), ('dor_abdominal', 'ist', 2.5),
    ('sangue_muco_fezes', 'gripal', 0.3), ('sangue_muco_fezes', 'diarreica', 12.4), ('sangue_muco_fezes', 'exantematica', 1.4), ('sangue_muco_fezes', 'hemorragica', 7.8), ('sangue_muco_fezes', 'conjuntivite', 2.9), ('sangue_muco_fezes', 'infeccao_urinaria', 0.4), ('sangue_muco_fezes', 'ist', 2.5),
    ('nausea_vomitos', 'gripal', 1.1), ('nausea_vomitos', 'diarreica', 12.4), ('nausea_vomitos', 'exantematica', 2.9), ('nausea_vomitos', 'hemorragica', 4.9), ('nausea_vomitos', 'conjuntivite', 0.4), ('nausea_vomitos', 'infeccao_urinaria', 1.9), ('nausea_vomitos', 'ist', 0.9),
    ('diarreia', 'gripal', 0.3), ('diarreia', 'diarreica', 19.2), ('diarreia', 'exantematica', 1.6), ('diarreia', 'hemorragica', 3.4), ('diarreia', 'conjuntivite', 2.9), ('diarreia', 'infeccao_urinaria', 1.1), ('diarreia', 'ist', 0.7),
    ('diminuicao_apetite', 'gripal', 3.8), ('diminuicao_apetite', 'diarreica', 8.8), ('diminuicao_apetite', 'exantematica', 4.5), ('diminuicao_apetite', 'hemorragica', 5.9), ('diminuicao_apetite', 'conjuntivite', 1.2), ('diminuicao_apetite', 'infeccao_urinaria', 1.5), ('diminuicao_apetite', 'ist', 0.9),
    ('olhos_vermelhos_lacrimejantes', 'gripal', 1.4), ('olhos_vermelhos_lacrimejantes', 'diarreica', 1.8), ('olhos_vermelhos_lacrimejantes', 'exantematica', 2.0), ('olhos_vermelhos_lacrimejantes', 'hemorragica', 0.6), ('olhos_vermelhos_lacrimejantes', 'conjuntivite', 31.1), ('olhos_vermelhos_lacrimejantes', 'infeccao_urinaria', 0.4), ('olhos_vermelhos_lacrimejantes', 'ist', 0.7),
    ('dor_ardencia_urinar', 'gripal', 0.3), ('dor_ardencia_urinar', 'diarreica', 0.3), ('dor_ardencia_urinar', 'exantematica', 0.2), ('dor_ardencia_urinar', 'hemorragica', 0.2), ('dor_ardencia_urinar', 'conjuntivite', 0.4), ('dor_ardencia_urinar', 'infeccao_urinaria', 27.8), ('dor_ardencia_urinar', 'ist', 8.0),
    ('bolhas_espinhas_descamacao_pele', 'gripal', 0.3), ('bolhas_espinhas_descamacao_pele', 'diarreica', 0.3), ('bolhas_espinhas_descamacao_pele', 'exantematica', 9.6), ('bolhas_espinhas_descamacao_pele', 'hemorragica', 1.3), ('bolhas_espinhas_descamacao_pele', 'conjuntivite', 2.9), ('bolhas_espinhas_descamacao_pele', 'infeccao_urinaria', 0.4), ('bolhas_espinhas_descamacao_pele', 'ist', 4.9),
    ('sangramento_olhos_gengiva_nariz', 'gripal', 0.3), ('sangramento_olhos_gengiva_nariz', 'diarreica', 0.3), ('sangramento_olhos_gengiva_nariz', 'exantematica', 0.6), ('sangramento_olhos_gengiva_nariz', 'hemorragica', 11.8), ('sangramento_olhos_gengiva_nariz', 'conjuntivite', 2.9), ('sangramento_olhos_gengiva_nariz', 'infeccao_urinaria', 0.4), ('sangramento_olhos_gengiva_nariz', 'ist', 0.2),
    ('urina_turva', 'gripal', 0.3), ('urina_turva', 'diarreica', 1.8), ('urina_turva', 'exantematica', 0.6), ('urina_turva', 'hemorragica', 2.9), ('urina_turva', 'conjuntivite', 0.4), ('urina_turva', 'infeccao_urinaria', 13.7), ('urina_turva', 'ist', 3.8),
    ('ferida_verruga_genital', 'gripal', 0.3), ('ferida_verruga_genital', 'diarreica', 0.3), ('ferida_verruga_genital', 'exantematica', 0.2), ('ferida_verruga_genital', 'hemorragica', 0.2), ('ferida_verruga_genital', 'conjuntivite', 0.4), ('ferida_verruga_genital', 'infeccao_urinaria', 1.9), ('ferida_verruga_genital', 'ist', 12.9),
    ('corrimento_genital', 'gripal', 0.3), ('corrimento_genital', 'diarreica', 0.3), ('corrimento_genital', 'exantematica', 0.2), ('corrimento_genital', 'hemorragica', 0.2), ('corrimento_genital', 'conjuntivite', 0.4), ('corrimento_genital', 'infeccao_urinaria', 1.9), ('corrimento_genital', 'ist', 14.3),
    ('ardencia_coceira_olhos', 'gripal', 0.3), ('ardencia_coceira_olhos', 'diarreica', 0.8), ('ardencia_coceira_olhos', 'exantematica', 2.2), ('ardencia_coceira_olhos', 'hemorragica', 1.3), ('ardencia_coceira_olhos', 'conjuntivite', 23.4), ('ardencia_coceira_olhos', 'infeccao_urinaria', 1.9), ('ardencia_coceira_olhos', 'ist', 0.2),
    ('dor_sangramento_relacao_sexual', 'gripal', 0.3), ('dor_sangramento_relacao_sexual', 'diarreica', 0.3), ('dor_sangramento_relacao_sexual', 'exantematica', 0.2), ('dor_sangramento_relacao_sexual', 'hemorragica', 2.1), ('dor_sangramento_relacao_sexual', 'conjuntivite', 0.4), ('dor_sangramento_relacao_sexual', 'infeccao_urinaria', 5.7), ('dor_sangramento_relacao_sexual', 'ist', 10.7),
    ('sangramento_urina', 'gripal', 0.3), ('sangramento_urina', 'diarreica', 0.3), ('sangramento_urina', 'exantematica', 0.2), ('sangramento_urina', 'hemorragica', 5.5), ('sangramento_urina', 'conjuntivite', 0.4), ('sangramento_urina', 'infeccao_urinaria', 12.9), ('sangramento_urina', 'ist', 2.5),
    ('coceira_regiao_genital', 'gripal', 0.3), ('coceira_regiao_genital', 'diarreica', 0.3), ('coceira_regiao_genital', 'exantematica', 0.2), ('coceira_regiao_genital', 'hemorragica', 0.2), ('coceira_regiao_genital', 'conjuntivite', 0.4), ('coceira_regiao_genital', 'infeccao_urinaria', 4.9), ('coceira_regiao_genital', 'ist', 10.3)
)
INSERT INTO syndrome_symptom_weight (
  syndrome_id,
  symptom_id,
  weight,
  active
)
SELECT
  sy.id,
  sm.id,
  seed.weight,
  true
FROM seed
INNER JOIN syndrome sy ON sy.code = seed.syndrome_code
INNER JOIN symptom sm ON sm.code = seed.symptom_code
ON CONFLICT (syndrome_id, symptom_id) DO UPDATE
SET
  weight = EXCLUDED.weight,
  active = true,
  updated_at = CURRENT_TIMESTAMP;
