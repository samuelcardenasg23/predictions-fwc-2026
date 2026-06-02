/*
  Warnings:

  - Added the required column `phase` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MatchPhase" AS ENUM ('GROUP_STAGE', 'KNOCKOUT');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "matchOrder" INTEGER,
ADD COLUMN     "phase" "MatchPhase" NOT NULL;
