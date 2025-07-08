import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import {
  TextField,
  Button,
  Paper,
  Box,
  Typography,
  InputLabel,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { Expense } from '../services/api'; // adjust path if needed

type ExpenseFormProps = {
  onAddExpense: (expense: Omit<Expense, 'id' | 'transaction_date'>) => void;
  onUploadReceipt: (file: File) => Promise<any>;
};

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

interface ExpenseFormData {
  amount: string;
  category: string;
  description: string;
  receipt: File | null;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense, onUploadReceipt }) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    category: '',
    description: '',
    receipt: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log form state changes
  useEffect(() => {
    console.log('Form state updated:', formData);
  }, [formData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> |
       React.ChangeEvent<{ name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    console.log('1. File input changed');
    const file = e.target.files?.[0];
    if (!file) {
        console.error('No file selected');
        return;
    }

    console.log('2. Selected file:', {
        name: file.name,
        type: file.type,
        size: file.size
    });
    
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPEG, PNG, etc.)');
        return;
    }

    console.log('3. Setting loading state');
    setIsLoading(true);

    try {
        console.log('4. Calling onUploadReceipt...');
        const data = await onUploadReceipt(file);
        console.log('5. Received response from onUploadReceipt:', data);
        
        if (data) {
            console.log('6. Processing extracted data:', data);
            
            // Create updates object with proper typing
            const updates: Partial<ExpenseFormData> = {};
            
            // Handle amount (convert to string for the input field)
            if (data.amount !== undefined) {
                updates.amount = data.amount.toString();
                console.log('7. Set amount to:', updates.amount);
            } else {
                console.warn('No amount found in extracted data');
            }
            
            // Handle amount (convert to string for the input field)
          //   if (data.amount !== undefined && data.amount !== null) {
          //       const rawAmount = typeof data.amount === 'string'
          //       ? data.amount.replace(/[₹,INR\s]/g, '')
          //       : data.amount;
                
          //       updates.amount = parseFloat(rawAmount).toString();
          //       console.log('7. Set amount to:', updates.amount);
          // } else {
          //     console.warn('No amount found in extracted data');
          // }

            
            // Handle category (ensure it's a string)
            if (data.category) {
                updates.category = data.category;
                console.log('8. Set category to:', updates.category);
            } else {
                console.warn('No category found, using default');
                updates.category = 'Other';
            }
            
            // Handle description/merchant
            if (data.merchant) {
                updates.description = `Payment to ${data.merchant}`;
                console.log('9. Set description to:', updates.description);
            }

            console.log('10. Updating form with:', updates);
            
            // Use functional update to ensure we have the latest state
            setFormData(prev => {
                const newData = { 
                    ...prev, 
                    ...updates,
                    receipt: file  // Keep the file reference
                };
                console.log('11. New form data after update:', newData);
                return newData;
            });
        } else {
            console.warn('12. No data returned from receipt processing');
            alert('Could not extract data from the receipt. Please enter the details manually.');
        }
    } catch (error) {
        console.error('13. Error processing receipt:', error);
        alert('Failed to process receipt. Please try again or enter the details manually.');
    } finally {
        console.log('14. Final cleanup');
        setIsLoading(false);
        // Reset file input to allow selecting the same file again
        if (e.target) {
            e.target.value = '';

            // Log final form state
            console.log('18. Final form state:', formData);
            console.log('19. Is form valid?', formData.amount && formData.category);
        }
    }
}; 


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }
  
    setIsLoading(true);
    try {
      const expenseData = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
      };
      
      await onAddExpense(expenseData);
      
      // Reset form on success
      setFormData({
        amount: '',
        category: '',
        description: '',
        receipt: null,
      });
      
      alert('Expense added successfully!');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({ amount: '', category: '', description: '', receipt: null });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Add New Expense
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <FormControl fullWidth margin="normal" required>
          <TextField
            label="Amount"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleInputChange}
            required
          />
        </FormControl>

        <FormControl fullWidth margin="normal" required>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            name="category"
            value={formData.category}
            label="Category"
            onChange={(e) =>
              handleInputChange(e as React.ChangeEvent<{ name?: string; value: unknown }>)
            }
            required
          >
            <MenuItem value="Food">Food</MenuItem>
            <MenuItem value="Transport">Transport</MenuItem>
            <MenuItem value="Shopping">Shopping</MenuItem>
            <MenuItem value="Bills">Bills</MenuItem>
            <MenuItem value="Entertainment">Entertainment</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
        </FormControl>

        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          fullWidth
          sx={{ mt: 2, mb: 2 }}
        >
          Upload Receipt
          <VisuallyHiddenInput
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </Button>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={!formData.amount || !formData.category}
        >
          {isLoading ? 'Processing...' : 'Add Expense'}
        </Button>

        <Button
          type="button"
          variant="outlined"
          color="secondary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleClear}
          disabled={isLoading}
        >
          Clear
        </Button>
      </Box>
    </Paper>
  );
};

export default ExpenseForm;
