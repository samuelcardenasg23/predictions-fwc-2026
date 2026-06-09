-- AlterTable: remove team-opts fields (bracket prediction model removed)
ALTER TABLE "Match" DROP COLUMN IF EXISTS "homeTeamOpts";
ALTER TABLE "Match" DROP COLUMN IF EXISTS "awayTeamOpts";

-- AlterTable: remove team-pick fields from Prediction
ALTER TABLE "Prediction" DROP COLUMN IF EXISTS "homeTeamPick";
ALTER TABLE "Prediction" DROP COLUMN IF EXISTS "awayTeamPick";
