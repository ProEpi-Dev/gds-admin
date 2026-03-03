-- Atribui o papel "participant" a todas as participation que ainda não possuem nenhuma participation_role.
-- Participations que já têm manager ou content_manager NÃO recebem participant (já têm permissões maiores).
-- Participations sem nenhuma role recebem participant.

INSERT INTO participation_role (participation_id, role_id)
SELECT p.id, r.id
FROM participation p
JOIN role r ON r.code = 'participant'
WHERE NOT EXISTS (
    SELECT 1 FROM participation_role pr WHERE pr.participation_id = p.id
)
ON CONFLICT (participation_id, role_id) DO NOTHING;
