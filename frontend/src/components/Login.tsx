import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Snackbar,
  Alert,
  Avatar
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      onLogin(credentialResponse.credential);
    } else {
      setError('Failed to authenticate with Google');
    }
  };

  const handleError = () => {
    setError('Login failed. Please try again.');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          textAlign: 'center',
        }}
      >
        <CardContent>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              margin: '0 auto 16px',
              bgcolor: 'primary.main',
            }}
          >
            <LockOutlinedIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" component="h1" gutterBottom>
            Expense Tracker
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to manage your expenses
          </Typography>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
            auto_select
            theme="filled_blue"
            size="large"
            width="300"  // Remove 'px' and just use number
            text="signin_with"
            shape="rectangular"
          />
          </Box>
        </CardContent>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setError(null)} 
            severity="error" 
            sx={{ 
              width: '100%',
              '& .MuiAlert-message': {
                width: '100%',
                textAlign: 'center'
              }
            }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Card>
    </Box>
  );
};

export default Login;