/*
  Warnings:

  - You are about to drop the column `employeeNumber` on the `Employee` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Employee_employeeNumber_companyId_key";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "employeeNumber";
