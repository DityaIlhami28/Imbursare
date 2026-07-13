-- CreateIndex
CREATE UNIQUE INDEX "Expense_companyId_expenseNumber_key" ON "Expense"("companyId", "expenseNumber");
