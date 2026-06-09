-- CreateTable
CREATE TABLE "UserStageLock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" "MatchStage" NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStageLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStageLock_userId_stage_key" ON "UserStageLock"("userId", "stage");

-- AddForeignKey
ALTER TABLE "UserStageLock" ADD CONSTRAINT "UserStageLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
