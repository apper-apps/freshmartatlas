import 'react-toastify/dist/ReactToastify.css'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Layout from "@/components/organisms/Layout";
import ProductManagement from "@/components/pages/ProductManagement";
import Analytics from "@/components/pages/Analytics";
import Category from "@/components/pages/Category";
import Account from "@/components/pages/Account";
import ProductDetail from "@/components/pages/ProductDetail";
import Orders from "@/components/pages/Orders";
import VendorPortal from "@/components/pages/VendorPortal";
import Cart from "@/components/pages/Cart";
import AIGenerate from "@/components/pages/AIGenerate";
import Home from "@/components/pages/Home";
import PayrollManagement from "@/components/pages/PayrollManagement";
import Checkout from "@/components/pages/Checkout";
import DeliveryDashboard from "@/components/pages/DeliveryDashboard";
import PaymentManagement from "@/components/pages/PaymentManagement";
import DeliveryTracking from "@/components/pages/DeliveryTracking";
import EmployeeManagement from "@/components/pages/EmployeeManagement";
import VendorManagement from "@/components/pages/VendorManagement";
import AttendanceTracking from "@/components/pages/AttendanceTracking";
import FinancialDashboard from "@/components/pages/FinancialDashboard";
import { RoleAssignment } from "@/components/pages/RoleAssignment";
import POS from "@/components/pages/POS";
import OrderSummary from "@/components/pages/OrderSummary";
import OrderTracking from "@/components/pages/OrderTracking";
import webSocketService from "@/services/api/websocketService";
import { persistor, store } from "@/store/index";
import { addRealTimeNotification, setConnectionStatus, updateApprovalStatus } from "@/store/approvalWorkflowSlice";

// Enhanced lazy component creation with proper error handling
// Enhanced lazy component creation with proper error handling
const createLazyComponent = (importFn, componentName) => {
  let retryCount = 0;
  const maxRetries = 3;
  
  const loadWithRetry = async () => {
try {
      const module = await importFn();
      
      // First check for default export (most common case)
      if (module?.default) {
        const defaultExport = module.default;
        // Ensure it's a valid React component (function or class)
        if (typeof defaultExport === 'function' || (typeof defaultExport === 'object' && defaultExport.prototype && defaultExport.prototype.render)) {
          return { default: defaultExport };
        }
      }
      
      // If no valid default export, look for named export matching componentName
      if (module && typeof module === 'object' && module[componentName]) {
        const namedExport = module[componentName];
        if (typeof namedExport === 'function' || (typeof namedExport === 'object' && namedExport.prototype && namedExport.prototype.render)) {
          return { default: namedExport };
        }
      }
      
      // Last resort: look for any function export
      if (module && typeof module === 'object') {
        const functionExport = Object.values(module).find(exp => typeof exp === 'function');
        if (functionExport) {
          return { default: functionExport };
        }
      }
      
      throw new Error(`Valid React component ${componentName} not found in module`);
    } catch (error) {
      console.error(`Failed to load ${componentName} (attempt ${retryCount + 1}):`, error);
      
      // Enhanced error tracking
      if (typeof window !== 'undefined' && window.performanceMonitor) {
        window.performanceMonitor.trackError(error, `lazy-load-${componentName}`);
      }
      
      // Retry logic for network-related errors
      if (retryCount < maxRetries && 
          (error?.message?.includes('Loading chunk') || 
           error?.message?.includes('fetch') ||
           error?.message?.includes('network'))) {
        retryCount++;
        console.log(`Retrying ${componentName} load (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return loadWithRetry();
      }
      
      throw error;
    }
  };

  return React.lazy(loadWithRetry);
};
// Enhanced error boundary for lazy components
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component error:', error, errorInfo);
    // Log additional debugging info
    console.error('Component name:', this.props.componentName);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { componentName = 'Unknown', error, retryCount } = this.state;
      
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Component Failed to Load</h2>
            <p className="text-gray-600 mb-4">
              The {componentName} component could not be loaded.
              {!navigator.onLine && (
                <span className="block text-orange-600 mt-2">
                  You appear to be offline. Please check your internet connection.
                </span>
              )}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
              <p className="text-sm text-red-700 font-medium mb-1">Error Details:</p>
              <p className="text-xs text-red-600 break-all">{error?.message || 'Unknown error'}</p>
              {retryCount > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Failed after {retryCount} retry attempts
                </p>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, retryCount: this.state.retryCount + 1 });
                }}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                Retry Loading
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200"
              >
                Go Back
              </button>
              {import.meta.env.DEV && (
                <button
                  onClick={() => console.log('Full error object:', error)}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Log Error to Console
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
// Lazy load heavy components for better performance with error handling
const AdminDashboard = createLazyComponent(() => import('@/components/pages/AdminDashboard'), 'AdminDashboard');
const PayrollCalculation = createLazyComponent(() => import('@/components/pages/PayrollCalculation'), 'PayrollCalculation');
// WebSocket Integration Component
const WebSocketProvider = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize WebSocket connection with comprehensive error handling
    const initializeWebSocket = async () => {
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      
      const connect = async () => {
        try {
          await webSocketService.connect();
          dispatch(setConnectionStatus(true));

          const handleApprovalUpdate = (data) => {
            dispatch(updateApprovalStatus(data));
          };

          const handleNewNotification = (data) => {
            dispatch(addRealTimeNotification(data));
          };

          const unsubscribeApprovals = webSocketService.subscribe('approval_update', handleApprovalUpdate);
          const unsubscribeStatusChanges = webSocketService.subscribe('approval_status_changed', handleApprovalUpdate);

          return () => {
            try {
              unsubscribeApprovals();
              unsubscribeStatusChanges();
              webSocketService.disconnect();
            } catch (error) {
              console.error('Error cleaning up WebSocket subscriptions:', error);
            }
          };
        } catch (error) {
          console.warn('WebSocket connection failed:', error);
          dispatch(setConnectionStatus(false));
          
          // Track WebSocket errors
          if (typeof window !== 'undefined' && window.performanceMonitor) {
            window.performanceMonitor.trackError(error, 'websocket-connection');
          }
          
          // Implement exponential backoff reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Attempting WebSocket reconnection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error('Max WebSocket reconnection attempts reached');
            // Dispatch error notification
            dispatch(addRealTimeNotification({
              id: Date.now(),
              type: 'connection_error',
              message: 'Real-time updates unavailable. Please refresh the page.',
              timestamp: new Date().toISOString()
            }));
          }
        }
      };
      
      return connect();
    };

    const cleanup = initializeWebSocket();
    
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn && typeof cleanupFn === 'function') {
          cleanupFn();
        }
      }).catch(error => {
        console.error('Error during WebSocket cleanup:', error);
      });
    };
  }, [dispatch]);

  return children;
};

// Main App component
function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);

  // Optimized SDK status checking - memoized for performance
  const checkSDKStatus = useCallback(() => {
    try {
      const status = {
        available: typeof window.Apper !== 'undefined',
        ready: typeof window.apperSDK !== 'undefined',
        initialized: window.apperSDK?.isInitialized === true
      };
      return status;
    } catch (error) {
      console.error('Error checking SDK status:', error);
      return { available: false, ready: false, initialized: false, error: error.message };
    }
  }, []);

  // Optimized SDK monitoring - non-blocking and lightweight
  useEffect(() => {
    let mounted = true;
    let checkCount = 0;
    
    const checkStatus = () => {
      if (!mounted || checkCount > 5) return; // Limit checks to prevent performance impact
      
      try {
        const status = checkSDKStatus();
        if (status.ready || status.initialized) {
          setSdkReady(true);
          setSdkError(null);
        } else if (checkCount === 5) {
          // After 5 attempts, just warn but don't block the app
          console.warn('SDK not ready after initial checks - continuing without it');
        }
        checkCount++;
      } catch (error) {
        console.warn('SDK check failed:', error);
        checkCount++;
      }
    };

    // Check immediately and then periodically
    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    
    // Clean timeout - don't wait forever
    const timeout = setTimeout(() => {
      if (mounted) {
        clearInterval(interval);
      }
    }, 6000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
}, [checkSDKStatus]);

  // Lightweight error handling - don't block the app for SDK errors
  useEffect(() => {
    const handleError = (event) => {
      if (event.reason?.message?.includes('Apper') || event.error?.message?.includes('Apper')) {
        console.warn('SDK error detected but not blocking app:', event);
        // Don't set SDK error state - just log it
      }
      
      // Handle DataCloneError specifically for postMessage operations
      if (event.reason?.name === 'DataCloneError' || event.error?.name === 'DataCloneError') {
        console.warn('DataCloneError detected - likely from postMessage with non-cloneable objects:', event);
        // Log the error but don't crash the app
      }
    };

    const handleMessageError = (event) => {
      console.warn('Message error detected:', event);
      // Handle postMessage errors gracefully
    };
    
    window.addEventListener('unhandledrejection', handleError);
    window.addEventListener('messageerror', handleMessageError);
    return () => {
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('messageerror', handleMessageError);
    };
  }, []);

  // Memoized SDK utilities for performance
  const sdkUtils = useMemo(() => ({
    ready: sdkReady,
    error: sdkError,
    checkStatus: checkSDKStatus
  }), [sdkReady, sdkError, checkSDKStatus]);

  // Component preloader for performance
  useEffect(() => {
    // Preload likely-to-be-visited components after initial render
    const preloadTimer = setTimeout(() => {
      import("@/components/pages/Category").catch(() => {});
      import("@/components/pages/Orders").catch(() => {});
      import("@/components/pages/Account").catch(() => {});
    }, 2000);

    return () => clearTimeout(preloadTimer);
}, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<Loading type="page" />} persistor={persistor}>
        <WebSocketProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              {/* Minimal SDK Status Indicator (only in development) */}
              {import.meta.env.DEV && sdkError && (
                <div className="fixed top-0 right-0 z-50 p-2 text-xs">
                  <div className="px-2 py-1 rounded bg-orange-500 text-white">
                    SDK: Background Loading
                  </div>
                </div>
              )}
              <Suspense fallback={<Loading type="page" />}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    {/* Core routes - no lazy loading */}
                    <Route index element={<Home />} />
                    <Route path="product/:productId" element={<ProductDetail />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="checkout" element={<Checkout />} />
                    
                    {/* Lazy loaded routes with error boundaries */}
<Route path="category/:categoryName" element={
                      <LazyErrorBoundary componentName="Category">
                        <Suspense fallback={<Loading type="page" />}>
                          <Category />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="orders" element={
                      <LazyErrorBoundary componentName="Orders">
                        <Suspense fallback={<Loading type="page" />}>
                          <Orders />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="order-summary/:orderId" element={
                      <LazyErrorBoundary componentName="OrderSummary">
                        <Suspense fallback={<Loading type="page" />}>
                          <OrderSummary />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="orders/:orderId" element={
                      <LazyErrorBoundary componentName="OrderTracking">
                        <Suspense fallback={<Loading type="page" />}>
                          <OrderTracking />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="account" element={
                      <LazyErrorBoundary componentName="Account">
                        <Suspense fallback={<Loading type="page" />}>
                          <Account />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    
                    {/* Heavy admin routes - lazy loaded with error boundaries */}
                    <Route path="admin" element={
                      <LazyErrorBoundary componentName="AdminDashboard">
                        <Suspense fallback={<Loading type="page" />}>
                          <AdminDashboard />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/products" element={
                      <LazyErrorBoundary componentName="ProductManagement">
                        <Suspense fallback={<Loading type="page" />}>
                          <ProductManagement />
                        </Suspense>
                      </LazyErrorBoundary>
} />
                    <Route path="admin/vendors" element={
                      <LazyErrorBoundary componentName="VendorManagement">
                        <Suspense fallback={<Loading type="page" />}>
                          <VendorManagement />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/pos" element={
                      <LazyErrorBoundary componentName="POS">
                        <Suspense fallback={<Loading type="page" />}>
                          <POS />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/delivery-dashboard" element={
                      <LazyErrorBoundary componentName="DeliveryDashboard">
                        <Suspense fallback={<Loading type="page" />}>
                          <DeliveryDashboard />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/analytics" element={
                      <LazyErrorBoundary componentName="Analytics">
                        <Suspense fallback={<Loading type="page" />}>
                          <Analytics />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/financial-dashboard" element={
                      <LazyErrorBoundary componentName="FinancialDashboard">
                        <Suspense fallback={<Loading type="page" />}>
                          <FinancialDashboard />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/payments" element={
                      <LazyErrorBoundary componentName="PaymentManagement">
                        <Suspense fallback={<Loading type="page" />}>
                          <PaymentManagement />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/ai-generate" element={
                      <LazyErrorBoundary componentName="AIGenerate">
                        <Suspense fallback={<Loading type="page" />}>
                          <AIGenerate />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/payroll" element={
                      <LazyErrorBoundary componentName="PayrollManagement">
                        <Suspense fallback={<Loading type="page" />}>
                          <PayrollManagement />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/employee-management" element={
                      <LazyErrorBoundary componentName="EmployeeManagement">
                        <Suspense fallback={<Loading type="page" />}>
                          <EmployeeManagement />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/attendance-tracking" element={
                      <LazyErrorBoundary componentName="AttendanceTracking">
                        <Suspense fallback={<Loading type="page" />}>
                          <AttendanceTracking />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    <Route path="admin/payroll-calculation" element={
                      <LazyErrorBoundary componentName="PayrollCalculation">
                        <Suspense fallback={<Loading type="page" />}>
                          <PayrollCalculation />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    
                    {/* Role Assignment Route - Admin Only */}
                    <Route path="role-management" element={
                      <LazyErrorBoundary componentName="RoleAssignment">
                        <Suspense fallback={<Loading type="page" />}>
                          <RoleAssignment />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                    
                    {/* Vendor Portal Route */}
                    <Route path="vendor-portal" element={
                      <LazyErrorBoundary componentName="VendorPortal">
                        <Suspense fallback={<Loading type="page" />}>
                          <VendorPortal />
                        </Suspense>
                      </LazyErrorBoundary>
                    } />
                  </Route>
</Routes>
              </Suspense>
              <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable
                pauseOnHover={false}
                theme="colored"
                style={{ zIndex: 9999 }}
                limit={3}
              />
            </div>
</BrowserRouter>
        </WebSocketProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;