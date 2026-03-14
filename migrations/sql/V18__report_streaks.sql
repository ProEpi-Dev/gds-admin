CREATE TABLE IF NOT EXISTS participation_report_day (
    id SERIAL PRIMARY KEY,
    participation_id INTEGER NOT NULL REFERENCES participation(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    report_count INTEGER NOT NULL DEFAULT 0,
    positive_count INTEGER NOT NULL DEFAULT 0,
    negative_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_participation_report_day UNIQUE (participation_id, report_date)
);

CREATE TABLE IF NOT EXISTS participation_report_streak (
    participation_id INTEGER PRIMARY KEY REFERENCES participation(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    reported_days_count INTEGER NOT NULL DEFAULT 0,
    last_reported_date DATE,
    current_streak_start_date DATE,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participation_report_day_participation_id
    ON participation_report_day(participation_id);
CREATE INDEX IF NOT EXISTS idx_participation_report_day_report_date
    ON participation_report_day(report_date);
CREATE INDEX IF NOT EXISTS idx_participation_report_streak_last_reported_date
    ON participation_report_streak(last_reported_date);

DROP TRIGGER IF EXISTS update_participation_report_day_updated_at ON participation_report_day;
CREATE TRIGGER update_participation_report_day_updated_at
    BEFORE UPDATE ON participation_report_day
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_participation_report_streak_updated_at ON participation_report_streak;
CREATE TRIGGER update_participation_report_streak_updated_at
    BEFORE UPDATE ON participation_report_streak
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO participation_report_day (
    participation_id,
    report_date,
    report_count,
    positive_count,
    negative_count,
    created_at,
    updated_at
)
SELECT
    r.participation_id,
    DATE(r.created_at) AS report_date,
    COUNT(*) AS report_count,
    COUNT(*) FILTER (WHERE r.report_type = 'POSITIVE') AS positive_count,
    COUNT(*) FILTER (WHERE r.report_type = 'NEGATIVE') AS negative_count,
    MIN(r.created_at) AS created_at,
    MAX(r.updated_at) AS updated_at
FROM report r
WHERE r.active = true
GROUP BY r.participation_id, DATE(r.created_at)
ON CONFLICT (participation_id, report_date) DO UPDATE
SET
    report_count = EXCLUDED.report_count,
    positive_count = EXCLUDED.positive_count,
    negative_count = EXCLUDED.negative_count,
    updated_at = CURRENT_TIMESTAMP;

WITH grouped_days AS (
    SELECT
        prd.participation_id,
        prd.report_date,
        (
            prd.report_date - (
                ROW_NUMBER() OVER (
                    PARTITION BY prd.participation_id
                    ORDER BY prd.report_date
                ) * INTERVAL '1 day'
            )
        )::date AS streak_group
    FROM participation_report_day prd
),
streaks AS (
    SELECT
        gd.participation_id,
        MIN(gd.report_date) AS start_date,
        MAX(gd.report_date) AS end_date,
        COUNT(*) AS streak_length
    FROM grouped_days gd
    GROUP BY gd.participation_id, gd.streak_group
),
day_counts AS (
    SELECT
        prd.participation_id,
        MAX(prd.report_date) AS last_reported_date,
        COUNT(*) AS reported_days_count
    FROM participation_report_day prd
    GROUP BY prd.participation_id
),
current_streaks AS (
    SELECT
        s.participation_id,
        s.start_date,
        s.end_date,
        s.streak_length
    FROM streaks s
    INNER JOIN day_counts dc
        ON dc.participation_id = s.participation_id
       AND dc.last_reported_date = s.end_date
),
longest_streaks AS (
    SELECT
        s.participation_id,
        s.streak_length,
        ROW_NUMBER() OVER (
            PARTITION BY s.participation_id
            ORDER BY s.streak_length DESC, s.end_date DESC
        ) AS rn
    FROM streaks s
)
INSERT INTO participation_report_streak (
    participation_id,
    current_streak,
    longest_streak,
    reported_days_count,
    last_reported_date,
    current_streak_start_date,
    created_at,
    updated_at
)
SELECT
    p.id AS participation_id,
    COALESCE(cs.streak_length, 0) AS current_streak,
    COALESCE(ls.streak_length, 0) AS longest_streak,
    COALESCE(dc.reported_days_count, 0) AS reported_days_count,
    dc.last_reported_date,
    cs.start_date AS current_streak_start_date,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM participation p
LEFT JOIN day_counts dc
    ON dc.participation_id = p.id
LEFT JOIN current_streaks cs
    ON cs.participation_id = p.id
LEFT JOIN longest_streaks ls
    ON ls.participation_id = p.id
   AND ls.rn = 1
ON CONFLICT (participation_id) DO UPDATE
SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    reported_days_count = EXCLUDED.reported_days_count,
    last_reported_date = EXCLUDED.last_reported_date,
    current_streak_start_date = EXCLUDED.current_streak_start_date,
    updated_at = CURRENT_TIMESTAMP;