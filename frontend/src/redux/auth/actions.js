// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\redux\auth\actions.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import * as authService from '@/auth';

export const login = createAsyncThunk(
  'auth/login',
  async ({ loginData }, { rejectWithValue }) => {
    console.log('Using auth actions v1');
    console.log('Login action started with:', loginData);
    try {
      console.log('Attempting authService.login');
      const data = await authService.login({ loginData });
      console.log('Login response:', data);
      if (data.success === true) {
        console.log('Success block entered, data:', data);
        const auth_state = {
          current: { 
            email: data.result.email || loginData.email, 
            role: data.result.role || 'owner', 
            _id: data.result._id, 
            name: data.result.name || 'Admin' 
          },
          token: data.result.token,
          isLoggedIn: true,
          isLoading: false,
          isSuccess: true,
        };
        console.log('Saving auth_state:', auth_state);
        window.localStorage.setItem('auth', JSON.stringify(auth_state));
        window.localStorage.removeItem('isLogout');
        console.log('Returning auth_state');
        return auth_state;
      } else {
        console.log('Login failed in else block:', data);
        return rejectWithValue(data.message || 'Login failed');
      }
    } catch (error) {
      console.log('Caught error in catch block:', error);
      return rejectWithValue(error.message || 'Login request failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ registerData }, { rejectWithValue }) => {
    const data = await authService.register({ registerData });
    if (data.success === true) {
      return data;
    } else {
      return rejectWithValue('Register failed');
    }
  }
);

export const verify = createAsyncThunk(
  'auth/verify',
  async ({ userId, emailToken }, { rejectWithValue }) => {
    const data = await authService.verify({ userId, emailToken });
    if (data.success === true) {
      const auth_state = {
        current: { email: data.result.email, role: data.result.role || 'owner' },
        token: data.result.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
      window.localStorage.removeItem('isLogout');
      return auth_state;
    } else {
      return rejectWithValue('Verify failed');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ resetPasswordData }, { rejectWithValue }) => {
    const data = await authService.resetPassword({ resetPasswordData });
    if (data.success === true) {
      const auth_state = {
        current: { email: resetPasswordData.email, role: data.result.role || 'owner' },
        token: data.result.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
      window.localStorage.removeItem('isLogout');
      return auth_state;
    } else {
      return rejectWithValue('Reset password failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    const result = window.localStorage.getItem('auth');
    const tmpAuth = JSON.parse(result);
    const settings = window.localStorage.getItem('settings');
    const tmpSettings = JSON.parse(settings);
    window.localStorage.removeItem('auth');
    window.localStorage.removeItem('settings');
    window.localStorage.setItem('isLogout', JSON.stringify({ isLogout: true }));
    const data = await authService.logout();
    if (data.success === false) {
      const auth_state = {
        current: tmpAuth.current,
        token: tmpAuth.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
      window.localStorage.setItem('settings', JSON.stringify(tmpSettings));
      window.localStorage.removeItem('isLogout');
      throw new Error('Logout failed');
    }
    return {};
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ entity, jsonData }, { rejectWithValue }) => {
    const data = await authService.updateProfile({ entity, jsonData });
    if (data.success === true) {
      const auth_state = {
        current: { email: data.result.email, role: data.result.role || 'owner' },
        token: data.result.token,
        isLoggedIn: true,
        isLoading: false,
        isSuccess: true,
      };
      window.localStorage.setItem('auth', JSON.stringify(auth_state));
      return auth_state;
    } else {
      return rejectWithValue('Update profile failed');
    }
  }
);

export default {
  login,
  register,
  verify,
  resetPassword,
  logout,
  updateProfile,
};
