import axios, { AxiosError, AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:5001';

export interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
}

export interface ExtractedReceiptData {
  amount?: number;
  category?: string;
  merchant?: string;
  date?: string;
  status?: string;
  [key: string]: any; // For any additional fields
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string }>) => {
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

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

export const uploadReceipt = async (file: File): Promise<ExtractedReceiptData> => {
  const formData = new FormData();
  formData.append('file', file); // Make sure this matches your backend's expected field name
  
  try {
    const response = await api.post<{ extracted_data: ExtractedReceiptData }>(
      '/api/upload-receipt',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.extracted_data;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};

// Utility function for error handling
export const handleApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return error.message || 'An unexpected error occurred';
};