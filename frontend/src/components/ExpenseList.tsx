import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Typography, Box, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { deleteExpense, editExpense, Expense } from '../services/api';
import type { SelectChangeEvent } from '@mui/material/Select';

// --- Number to Words Utility (Indian system) ---
function numberToWords(num: number): string {
  if (num === 0) return "Zero rupees";
  const a = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
  ];
  const b = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
  ];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }

  return (
    inWords(Math.floor(num))
      .replace(/\s+/g, ' ')
      .replace(/^./, c => c.toUpperCase())
      + ' rupees'
  );
}

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

interface ExpenseListProps {
  expenses: Expense[];
  isLoading: boolean;
  onBack: () => void;
  onRefresh?: () => void;
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
  } catch (e) {
    console.error('Error calculating monthly total:', e);
    return 0;
  }
};

function getMonthlyExpenseData(expenses: Expense[]) {
  const data: { month: string; total: number }[] = [];
  const grouped: { [key: string]: number } = {};

  expenses.forEach(expense => {
    const date = new Date(expense.transaction_date);
    const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;
    grouped[month] = (grouped[month] || 0) + (isNaN(amount) ? 0 : amount);
  });

  data.push(...Object.entries(grouped).map(([month, total]) => ({ month, total })));
  data.sort((a, b) => a.month.localeCompare(b.month));
  return data;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, isLoading, onBack, onRefresh }) => {
  const currentMonthTotal = getCurrentMonthTotal(expenses);
  const monthlyData = getMonthlyExpenseData(expenses);

  // --- Edit/Delete State ---
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState<{ amount: string; category: string; description: string }>({
    amount: '',
    category: '',
    description: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // --- Filter/Search State ---
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchText, setSearchText] = useState<string>('');

  // --- Filtering Logic ---
  const filteredExpenses = expenses.filter(expense => {
    // Filter by category
    const matchesCategory = selectedCategory === 'All' || expense.category === selectedCategory;
    // Filter by search text (case-insensitive, checks category and description)
    const search = searchText.trim().toLowerCase();
    const matchesSearch =
      !search ||
      (expense.description && expense.description.toLowerCase().includes(search)) ||
      (expense.category && expense.category.toLowerCase().includes(search));
    return matchesCategory && matchesSearch;
  });

  // --- Handlers ---
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteExpense(id);
      if (onRefresh) onRefresh();
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditForm({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || ''
    });
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    if (!editingExpense) return;
    setEditLoading(true);
    await editExpense(editingExpense.id, {
      amount: parseFloat(editForm.amount),
      category: editForm.category,
      description: editForm.description
    });
    setEditLoading(false);
    setEditingExpense(null);
    if (onRefresh) onRefresh();
  };

  return (
    <Box>
      {/* Back Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          color="primary"
        >
          Back to Add Expense
        </Button>
      </Box>

      {/* Filter/Search Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Food">Food</MenuItem>
            <MenuItem value="Travel">Travel</MenuItem>
            <MenuItem value="Shopping">Shopping</MenuItem>
            <MenuItem value="Bills">Bills</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Search"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search description or category"
          sx={{ flex: 1 }}
        />
      </Box>

      {/* Monthly Expense Bar Chart */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>Monthly Expense History</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
            <Legend />
            <Bar dataKey="total" fill="#1976d2" name="Total Spent" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Monthly Total Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">
            Total spent this month:
          </Typography>
          <Typography variant="h4" color="primary">
            ₹{currentMonthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            {numberToWords(currentMonthTotal)}
          </Typography>
        </CardContent>
      </Card>

      {/* Expense Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No expenses found.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map(expense => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.transaction_date)}</TableCell>
                  <TableCell>
                    ₹{typeof expense.amount === 'string'
                      ? parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                      : expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{expense.description || '-'}</TableCell>
                  <TableCell>
                    <Button size="small" color="primary" onClick={() => handleEdit(expense)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDelete(expense.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Modal */}
      <Dialog open={!!editingExpense} onClose={() => setEditingExpense(null)}>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
          <TextField
            label="Amount"
            name="amount"
            type="number"
            value={editForm.amount}
            onChange={handleEditChange}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={editForm.category}
              label="Category"
              onChange={handleEditChange}
            >
              <MenuItem value="Food">Food</MenuItem>
              <MenuItem value="Travel">Travel</MenuItem>
              <MenuItem value="Shopping">Shopping</MenuItem>
              <MenuItem value="Bills">Bills</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description"
            name="description"
            value={editForm.description}
            onChange={handleEditChange}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)} disabled={editLoading}>Cancel</Button>
          <Button onClick={handleEditSave} color="primary" disabled={editLoading}>
            {editLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};