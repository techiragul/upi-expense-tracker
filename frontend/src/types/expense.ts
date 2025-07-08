// src/types/expense.ts
export interface Expense {
    id: number;
    amount: number;
    category: string;
    merchant?: string;
    description?: string;
    transaction_date: string;
    receipt_url?: string;
  }