-- CreateTable
CREATE TABLE "SavedBuild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "heroId" INTEGER NOT NULL,
    "itemIds" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "SavedBuild_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SavedBuild" ADD CONSTRAINT "SavedBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
