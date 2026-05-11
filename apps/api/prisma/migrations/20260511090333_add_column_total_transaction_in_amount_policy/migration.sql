/*
  Warnings:

  - Added the required column `totalTransactions` to the `AmountPolicy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AmountPolicy" ADD COLUMN     "totalTransactions" INTEGER NOT NULL;
