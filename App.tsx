import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProvider } from './src/contexts/UserContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <KeyboardProvider>
          <AppNavigator />
        </KeyboardProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
