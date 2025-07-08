import React, { useState, useEffect } from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme, Box, Typography } from '@mui/material';
import ExpenseForm from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { getExpenses, addExpense as addExpenseApi, uploadReceipt, Expense } from './services/api';

const theme = createTheme({
  palette: {
    primary: {main: '#1976d2',},
    secondary: {main: '#dc004e',},
  },
  typography: {
    h4: {fontWeight: 600,margin: '1rem 0',},
  },
});

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'transaction_date'>) => {
    try {
      await addExpenseApi(expense);
      await fetchExpenses(); // Refresh the expenses list
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

const handleUploadReceipt = async (file: File) => {
  try {
    // No need to create FormData here, it's now handled in the api.ts
    const extractedData = await uploadReceipt(file);
    return extractedData;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Expense Tracker
          </Typography>
          <ExpenseForm 
            onAddExpense={handleAddExpense}
            onUploadReceipt={handleUploadReceipt}
          />
          <ExpenseList expenses={expenses} isLoading={isLoading} />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;


