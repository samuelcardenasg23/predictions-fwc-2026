-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awayTeamOpts" TEXT,
ADD COLUMN     "homeTeamOpts" TEXT;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "awayTeamPick" TEXT,
ADD COLUMN     "homeTeamPick" TEXT;
