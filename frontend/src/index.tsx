import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Make sure this matches your Google Cloud Console client ID exactly
// In index.tsx
const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 
  '624281363106-oopuekl0evev5i88vh64t0e0gce6amh6.apps.googleusercontent.com';
if (!clientId) {
  console.error('Missing GOOGLE_CLIENT_ID in environment variables');
}

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId || ''}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);