/*
  Warnings:

  - You are about to drop the column `positionId` on the `AmountPolicy` table. All the data in the column will be lost.
  - Added the required column `level` to the `AmountPolicy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AmountPolicy" DROP CONSTRAINT "AmountPolicy_positionId_fkey";

-- DropIndex
DROP INDEX "AmountPolicy_positionId_key";

-- AlterTable
ALTER TABLE "AmountPolicy" DROP COLUMN "positionId",
ADD COLUMN     "level" INTEGER NOT NULL;
