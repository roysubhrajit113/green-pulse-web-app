// frontend/src/App.js
import './assets/css/App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/auth';
import AdminLayout from './layouts/admin';
import { ChakraProvider } from '@chakra-ui/react';
import initialTheme from './theme/theme';
import { useState, useEffect } from 'react';
import { CarbonProvider } from './contexts/CarbonContext';
import { InstituteProvider } from './contexts/InstituteContext';
import { DepartmentProvider } from './contexts/DepartmentContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/loading_screen/LoadingScreen';
import Chatbot from './components/chatbot/Chatbot'; // Added from first code

export default function Main() {
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing Green Pulse Dashboard...");
  
  useEffect(() => {
    // Enhanced loading process with comprehensive progress updates
    const loadingSteps = [
      { progress: 15, message: "Loading blockchain services..." },
      { progress: 30, message: "Connecting to energy oracle..." },
      { progress: 45, message: "Initializing carbon tracking..." },
      { progress: 60, message: "Setting up energy tokens..." },
      { progress: 75, message: "Loading institute data..." },
      { progress: 90, message: "Setting up dashboard components..." },
      { progress: 100, message: "Welcome to Green Pulse Dashboard!" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        setLoadingProgress(loadingSteps[currentStep].progress);
        setLoadingMessage(loadingSteps[currentStep].message);
        currentStep++;
      } else {
        clearInterval(interval);
        // Add a small delay before hiding loading screen (from second code)
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    }, 700); // Slightly faster progression

    return () => clearInterval(interval);
  }, []);
  
  return (
    <ErrorBoundary>
      <ChakraProvider theme={currentTheme || initialTheme}> {/* Added fallback from second code */}
        <AuthProvider>
          <InstituteProvider>
            <DepartmentProvider>
              <CarbonProvider>
                {isLoading && (
                  <LoadingScreen 
                    loading={isLoading}
                    progress={loadingProgress}
                    message={loadingMessage}
                  />
                )}
                <Routes>
                  <Route path="auth/*" element={<AuthLayout />} />
                  <Route
                    path="admin/*"
                    element={
                      <AdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                    }
                  />
                  <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />
                </Routes>
                {/* Add Chatbot component to appear on all pages (from first code) */}
                <Chatbot />
              </CarbonProvider>
            </DepartmentProvider>
          </InstituteProvider>
        </AuthProvider>
      </ChakraProvider>
    </ErrorBoundary>
  );
}
