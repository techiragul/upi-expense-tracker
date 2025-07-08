import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, Card, CardContent } from '@mui/material';

// Format date without using date-fns
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface Expense {
  id: number;
  amount: number | string;
  category: string;
  description?: string;
  transaction_date: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
}

const getCurrentMonthTotal = (expenses: Expense[]): number => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return expenses
      .filter(expense => {
        try {
          const expenseDate = new Date(expense.transaction_date);
          return (
            expenseDate.getMonth() === currentMonth &&
            expenseDate.getFullYear() === currentYear
          );
        } catch (e) {
          console.error('Error processing expense date:', e);
          return false;
        }
      })
      .reduce((total, expense) => {
        const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;
        return total + (isNaN(amount) ? 0 : amount);
      }, 0);
  } catch (error) {
    console.error('Error calculating monthly total:', error);
    return 0;
  }
};

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, isLoading }) => {
  const currentMonthTotal = Number(getCurrentMonthTotal(expenses)) || 0;
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  
  const total = expenses.reduce((sum, expense) => {
    const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  if (expenses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly Spending Summary
            </Typography>
            <Typography variant="body1">
              Since we just started tracking your expenses, we don't have any expenses to report yet.
            </Typography>
            <Typography variant="h5" sx={{ mt: 2, color: 'primary.main', fontWeight: 'bold' }}>
              Current Total Spend for {currentMonth}: ₹0.00
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Add your first expense to see your spending summary here!
            </Typography>
          </CardContent>
        </Card>
        <Typography variant="body1" color="text.secondary">
          No expenses recorded yet. Add your first expense above!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monthly Spending Summary
          </Typography>
          <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            ₹{currentMonthTotal.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total spend in {currentMonth} {new Date().getFullYear()}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} recorded
          </Typography>
        </CardContent>
      </Card>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Expense History
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {formatDate(expense.transaction_date)}
                  </TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{expense.description || '-'}</TableCell>
                  <TableCell align="right">
                    ₹{typeof expense.amount === 'string' 
                      ? parseFloat(expense.amount).toFixed(2) 
                      : expense.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                <TableCell colSpan={3} align="right">
                  <strong>Total:</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>₹{total.toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};



