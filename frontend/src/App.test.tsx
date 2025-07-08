import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getExpenses, addExpense, uploadReceipt } from './services/api';

// Mock the API module
jest.mock('./services/api');

// Mock data
const mockExpenses = [
  {
    id: 1,
    amount: 25.50,
    category: 'Food & Dining',
    merchant: 'Burger King',
    description: 'Lunch',
    transaction_date: '2023-07-06T12:30:00Z'
  },
  {
    id: 2,
    amount: 49.99,
    category: 'Shopping',
    merchant: 'Amazon',
    description: 'USB Cable',
    transaction_date: '2023-07-05T15:45:00Z'
  }
];

describe('Expense Tracker App', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (getExpenses as jest.Mock).mockResolvedValue(mockExpenses);
  });

  describe('Initial Render', () => {
    it('displays the application title', () => {
      render(<App />);
      expect(screen.getByRole('heading', { name: /expense tracker/i })).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(<App />);
      expect(screen.getByText(/loading.../i)).toBeInTheDocument();
    });
  });

  describe('Expense List', () => {
    it('displays a list of expenses after loading', async () => {
      render(<App />);
      
      // Wait for expenses to load
      const expenseItems = await screen.findAllByRole('row');
      
      // +1 for the header row
      expect(expenseItems).toHaveLength(mockExpenses.length + 1);
      
      // Verify first expense
      expect(screen.getByText('Burger King')).toBeInTheDocument();
      expect(screen.getByText('25.50')).toBeInTheDocument();
      expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    });

    it('displays empty state when no expenses', async () => {
      (getExpenses as jest.Mock).mockResolvedValueOnce([]);
      render(<App />);
      
      const emptyMessage = await screen.findByText(/no expenses recorded yet/i);
      expect(emptyMessage).toBeInTheDocument();
    });
  });

  describe('Adding Expenses', () => {
    it('allows adding a new expense', async () => {
      const newExpense = {
        id: 3,
        amount: 15.75,
        category: 'Coffee',
        description: 'Morning coffee',
        transaction_date: new Date().toISOString()
      };
      
      (addExpense as jest.Mock).mockResolvedValueOnce(newExpense);
      render(<App />);
      
      // Wait for initial load
      await screen.findByText('Burger King');
      
      // Fill out the form
      userEvent.type(screen.getByLabelText(/amount/i), '15.75');
      userEvent.type(screen.getByLabelText(/category/i), 'Coffee');
      userEvent.type(screen.getByLabelText(/description/i), 'Morning coffee');
      
      // Submit the form
      userEvent.click(screen.getByRole('button', { name: /add expense/i }));
      
      // Verify API was called
      expect(addExpense).toHaveBeenCalledWith({
        amount: 15.75,
        category: 'Coffee',
        description: 'Morning coffee'
      });
      
      // Verify UI updates
      await waitFor(() => {
        expect(screen.getByText('Morning coffee')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when fetching expenses fails', async () => {
      (getExpenses as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
      render(<App />);
      
      const errorMessage = await screen.findByText(/error fetching expenses/i);
      expect(errorMessage).toBeInTheDocument();
    });

    it('shows error when adding expense fails', async () => {
      (addExpense as jest.Mock).mockRejectedValueOnce(new Error('Failed to add expense'));
      render(<App />);
      
      // Wait for initial load
      await screen.findByText('Burger King');
      
      // Try to add an expense
      userEvent.click(screen.getByRole('button', { name: /add expense/i }));
      
      // Verify error is shown
      const errorMessage = await screen.findByText(/error adding expense/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('Receipt Upload', () => {
    it('allows uploading a receipt', async () => {
      const mockFile = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      const mockReceiptData = {
        amount: 12.34,
        merchant: 'Test Merchant',
        category: 'Test Category'
      };
      
      (uploadReceipt as jest.Mock).mockResolvedValueOnce(mockReceiptData);
      render(<App />);
      
      // Upload file
      const fileInput = screen.getByLabelText(/upload receipt/i);
      userEvent.upload(fileInput, mockFile);
      
      // Verify API was called with the file
      await waitFor(() => {
        expect(uploadReceipt).toHaveBeenCalledWith(mockFile);
      });
      
      // Verify form is populated with extracted data
      expect(screen.getByDisplayValue('12.34')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Merchant')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Category')).toBeInTheDocument();
    });
  });
});

