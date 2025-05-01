/*
 * File Path: frontend/src/apps/IdurarOs.jsx
 * Purpose: Top-level router for IDURAR ERP CRM, toggling between authenticated (ErpApp) and unauthenticated (AuthRouter) routes.
 * How It Works:
 *   - Uses Redux to check auth state (isAuthenticated, isLoading) from localStorage.auth.
 *   - Renders PageLoader during auth sync, AuthRouter for unauthenticated users, or ErpApp for authenticated users.
 *   - Applies fade transition via inline styles for smooth UI changes.
 *   - Detects offline status and handles session timeouts with redirects.
 * Dependencies:
 *   - react, react-redux: State management (version 18.3.1, 9.1.5).
 *   - react-router-dom: useNavigate for redirects.
 *   - redux/auth: selectAuth, logOut, initializeAuth actions.
 *   - PageLoader/index.jsx: Loading spinner during auth sync.
 *   - AuthRouter.jsx: Unauthenticated routes (e.g., /login).
 *   - ErpApp.jsx: Authenticated routes (e.g., /grok).
 *   - context/appContext/index.jsx: AppContextProvider for app-wide state.
 *   - global.css: centerAbsolute for PageLoader.
 * Change Log:
 *   - 04/07/2025: Initialized with auth-based routing, PageLoader, and transition.css.
 *   - 04/23/2025: Fixed findDOMNode warning by removing TransitionGroup.
 *   - 04/23/2025: Added debug logging for PageLoader and auth sync.
 *   - 04/23/2025: Removed Localization.jsx and transition.css imports to fix Vite import errors.
 *   - 04/24/2025: Fixed isAuthenticated: false despite valid token.
 *     - Why: App stuck at AuthRouter despite login success (User, 04/24/2025).
 *     - How: Dispatched initializeAuth to sync Redux state with localStorage.auth, enhanced token validation.
 *     - Test: Run `npm run dev`, login, verify redirect to ErpApp, console logs “IdurarOs: Authenticated, rendering ErpApp”.
 * Test Instructions:
 *   - Run `npm run dev`, navigate to /grok: Verify redirect to /login if unauthenticated, ErpApp if authenticated.
 *   - Login with admin@idurarapp.com/admin123: Confirm redirect to ErpApp, console logs “IdurarOs: Authenticated, rendering ErpApp”.
 *   - Clear localStorage.auth: Confirm redirect to AuthRouter, no isAuthenticated: false with valid token.
 * Future Enhancements:
 *   - Add offline caching for settings (Sprint 4).
 *   - Support multi-language routing with antdLocale.js (Sprint 5).
 * Self-Notes:
 *   - Nate: Fixed isAuthenticated: false to ensure proper routing after login (04/24/2025).
 */
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectAuth, logOut, initializeAuth } from '@/redux/auth/selectors';
import PageLoader from '@/components/PageLoader';
import AuthRouter from '@/router/AuthRouter';
import ErpApp from './ErpApp';
import { AppContextProvider } from '@/context/appContext';

// Inline fade styles
const fadeStyle = {
  opacity: 1,
  transition: 'opacity 0.3s ease-in-out',
};

export default function IdurarOs() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useSelector(selectAuth);
  console.log('IdurarOs: Auth state:', { isAuthenticated, isLoading, localStorageAuth: localStorage.getItem('auth') });

  useEffect(() => {
    console.log('IdurarOs: Setting up offline detection');
    const handleOffline = () => {
      console.log('IdurarOs: Offline detected');
      // Notify user or adjust UI
    };

    const handleOnline = () => {
      console.log('IdurarOs: Online restored');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    console.log('IdurarOs: Initializing auth state');
    // Sync Redux state with localStorage.auth
    const auth = JSON.parse(localStorage.getItem('auth'));
    if (auth?.token && auth?.isLoggedIn) {
      console.log('IdurarOs: Valid token found, dispatching initializeAuth');
      dispatch(initializeAuth(auth));
    } else if (!auth && !isAuthenticated) {
      console.log('IdurarOs: No token, dispatching logOut');
      dispatch(logOut());
    }
  }, [dispatch]);

  useEffect(() => {
    console.log('IdurarOs: Checking auth token');
    const auth = JSON.parse(localStorage.getItem('auth'));
    if (auth?.token) {
      const currentTime = Date.now();
      const tokenCreationTime = auth.createdAt || currentTime;
      const sessionDuration = 12 * 60 * 60 * 1000; // 12 hours
      if (currentTime - tokenCreationTime > sessionDuration) {
        console.log('IdurarOs: Session expired, logging out');
        dispatch(logOut());
        navigate('/login');
      } else if (!isAuthenticated && !isLoading) {
        console.log('IdurarOs: Valid token but not authenticated, redirecting to /grok');
        navigate('/grok');
      }
    } else if (!isAuthenticated && !isLoading) {
      console.log('IdurarOs: No token, redirecting to login');
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, dispatch, navigate]);

  let content;
  if (isLoading) {
    console.log('IdurarOs: Rendering PageLoader during auth sync');
    content = <PageLoader />;
  } else if (!isAuthenticated) {
    console.log('IdurarOs: Unauthenticated, rendering AuthRouter');
    content = <AuthRouter />;
  } else {
    console.log('IdurarOs: Authenticated, rendering ErpApp');
    content = <ErpApp />;
  }

  return (
    <AppContextProvider>
      <div style={fadeStyle}>{content}</div>
    </AppContextProvider>
  );
}
