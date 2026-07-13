-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('VALID', 'INVALID', 'UNVERIFIED');

-- AlterTable
ALTER TABLE "ExpenseAttachment" ADD COLUMN     "ocrAmount" DOUBLE PRECISION,
ADD COLUMN     "ocrStatus" "OcrStatus";
