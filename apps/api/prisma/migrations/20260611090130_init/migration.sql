/*
  Warnings:

  - You are about to drop the column `currentApprovalSequence` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the column `sequence` on the `ExpenseApproval` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[expenseId]` on the table `ExpenseApproval` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ExpenseApproval_expenseId_sequence_key";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "currentApprovalSequence";

-- AlterTable
ALTER TABLE "ExpenseApproval" DROP COLUMN "sequence";

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseApproval_expenseId_key" ON "ExpenseApproval"("expenseId");
