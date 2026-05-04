-- AlterTable
ALTER TABLE "_ExpenseCategories" ADD CONSTRAINT "_ExpenseCategories_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ExpenseCategories_AB_unique";
