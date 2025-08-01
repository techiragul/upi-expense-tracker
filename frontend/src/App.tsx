import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, CssBaseline, ThemeProvider, createTheme, Box, Typography, Avatar, Divider, IconButton
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ExpenseForm from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import Login from './components/Login';
import { getExpenses, addExpense as addExpenseApi, uploadReceipt, Expense } from './services/api';
import { jwtDecode } from 'jwt-decode';

// Google payload interface for jwt-decode
type GooglePayload = {
  name: string;
  picture: string;
  email: string;
  sub?: string;
  [key: string]: any;
};

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<GooglePayload | null>(null);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [showExpenseForm, setShowExpenseForm] = useState(true);

  // Theme with dark mode support
  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode,
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
      },
      typography: {
        h4: { fontWeight: 600, margin: '1rem 0' },
      },
    }), [mode]);

  // Restore user info and token if already logged in
  useEffect(() => {
    const token = localStorage.getItem('google_id_token');
    if (token) {
      try {
        const decoded = jwtDecode<GooglePayload>(token);
        setUserInfo(decoded);
        setUserToken(token);
      } catch (e) {
        console.error("Could not decode user info:", e);
      }
    }
  }, []);

  // Fetch expenses when logged in or after adding
  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (userToken) fetchExpenses();
  }, [userToken]);

  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'transaction_date'>) => {
    try {
      await addExpenseApi(expense);
      await fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  const handleUploadReceipt = async (file: File) => {
    try {
      const extractedData = await uploadReceipt(file);
      return extractedData;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw error;
    }
  };

  const handleLogin = (token: string) => {
    try {
      const decoded = jwtDecode<GooglePayload>(token);
      setUserInfo(decoded);
      setUserToken(token);
      localStorage.setItem('google_id_token', token);
    } catch (e) {
      console.error("Could not decode user info:", e);
    }
  };

  const handleLogout = () => {
    setUserToken(null);
    setUserInfo(null);
    localStorage.removeItem('google_id_token');
  };

  // Navigation handlers
  const handleShowExpenseHistory = () => setShowExpenseForm(false);
  const handleBackToExpenseForm = () => setShowExpenseForm(true);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          {/* Profile info and logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            {userInfo && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar alt={userInfo.name} src={userInfo.picture} sx={{ width: 42, height: 42 }} />
                <Typography variant="h6">Welcome, {userInfo.name}!</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => setMode(mode === 'light' ? 'dark' : 'light')} color="inherit">
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
              {userToken && (
                <IconButton onClick={handleLogout} color="primary">
                  Logout
                </IconButton>
              )}
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Expense Tracke
          </Typography>
          {!userToken ? (
            <Login onLogin={handleLogin}/>
          ) : (
            showExpenseForm ? (
              <ExpenseForm
                onAddExpense={handleAddExpense}
                onUploadReceipt={handleUploadReceipt}
                onShowHistory={handleShowExpenseHistory}
              />
            ) : (
              <ExpenseList
                expenses={expenses}
                isLoading={isLoading}
                onBack={handleBackToExpenseForm}
                onRefresh={fetchExpenses}
              />
            )
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;