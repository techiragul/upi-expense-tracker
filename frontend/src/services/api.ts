import axios, { AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:5001';

export interface Expense {
  id: number;
  amount: number | string;
  category: string;
  description: string;
  transaction_date: string;
  merchant?: string;
  user_id?: string;
}

export interface ExtractedReceiptData {
  amount?: number;
  category?: string;
  merchant?: string;
  date?: string;
  status?: string;
  [key: string]: any;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the Google ID token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('google_id_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (token expired/invalid)
      localStorage.removeItem('google_id_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Expense API functions
export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const response = await api.get<Expense[]>('/api/expenses');
    return response.data;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};

export const addExpense = async (expense: Omit<Expense, 'id' | 'transaction_date'>): Promise<Expense> => {
  try {
    const response = await api.post<Expense>('/api/expenses', expense);
    return response.data;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

export const editExpense = async (id: number, expense: Partial<Expense>): Promise<Expense> => {
  try {
    const response = await api.put<Expense>(`/api/expenses/${id}`, expense);
    return response.data;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

export const deleteExpense = async (id: number): Promise<void> => {
  try {
    await api.delete(`/api/expenses/${id}`);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

// Receipt Upload
export const uploadReceipt = async (file: File): Promise<ExtractedReceiptData> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<ExtractedReceiptData>(
      '/api/upload-receipt',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('google_id_token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};

// Verify Google token
// This is now handled by the backend, but keeping the function for reference
export const verifyGoogleToken = async (token: string): Promise<boolean> => {
  try {
    await api.post('/api/verify-token', { token });
    return true;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};