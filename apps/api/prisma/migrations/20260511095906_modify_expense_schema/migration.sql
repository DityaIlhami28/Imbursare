/*
  Warnings:

  - You are about to drop the `_ExpenseCategories` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ExpenseCategories" DROP CONSTRAINT "_ExpenseCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "_ExpenseCategories" DROP CONSTRAINT "_ExpenseCategories_B_fkey";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "categoryId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_ExpenseCategories";

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
