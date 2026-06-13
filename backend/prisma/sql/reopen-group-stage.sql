-- Reapertura de la fase de grupos — datos de SystemConfig (ejecutar en Neon tras `prisma migrate deploy`).
--
-- 1. La migración 20260613120000_add_group_stage_entry_at agrega User.groupStageEntryAt.
-- 2. NO tocar groupStageLockedAt de quienes ya finalizaron (quedan legacy bloqueados).
-- 3. NO resetear excludedFromPool de México vs Sudáfrica.
--
-- Deadline global = kickoff de España vs Cabo Verde = 2026-06-15 11:00 AM Colombia (16:00 UTC).

INSERT INTO "SystemConfig" (key, value, "updatedAt")
VALUES ('group_stage_deadline_at', '2026-06-15T16:00:00.000Z', NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();

INSERT INTO "SystemConfig" (key, value, "updatedAt")
VALUES ('group_stage_reopened_at', NOW()::text, NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();
