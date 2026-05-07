/*
  Warnings:

  - You are about to drop the column `amountPolicyId` on the `Membership` table. All the data in the column will be lost.
  - Added the required column `positionLevelId` to the `AmountPolicy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positionLevelId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_amountPolicyId_fkey";

-- AlterTable
ALTER TABLE "AmountPolicy" ADD COLUMN     "positionLevelId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "amountPolicyId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "positionLevelId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PositionLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionLevel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_positionLevelId_fkey" FOREIGN KEY ("positionLevelId") REFERENCES "PositionLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmountPolicy" ADD CONSTRAINT "AmountPolicy_positionLevelId_fkey" FOREIGN KEY ("positionLevelId") REFERENCES "PositionLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
