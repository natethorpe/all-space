// C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\auth\auth.service.js
import apiClient from '@/config/serverApiConfig';
import errorHandler from '@/request/errorHandler';
import successHandler from '@/request/successHandler';
import { API_BASE_URL } from '@/config/serverApiConfig';

export const login = async ({ loginData }) => {
  console.log('authService.login called with:', loginData);
  console.log('API_BASE_URL:', API_BASE_URL);
  try {
    const response = await apiClient.post('auth/login', loginData, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Raw axios response:', response.data);
    successHandler(response, { notifyOnSuccess: false, notifyOnFailed: true });
    return response.data; // Should return { success: true, user: { id, email, name, role } }
  } catch (error) {
    console.error('Login error:', error.response ? error.response.data : error.message);
    return errorHandler(error);
  }
};

// Keep other functions as-is
export const register = async ({ registerData }) => {
  try {
    const response = await apiClient.post('register', registerData);
    const { status, data } = response;
    successHandler({ data, status }, { notifyOnSuccess: true, notifyOnFailed: true });
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const verify = async ({ userId, emailToken }) => {
  try {
    const response = await apiClient.get(`verify/${userId}/${emailToken}`);
    const { status, data } = response;
    successHandler({ data, status }, { notifyOnSuccess: true, notifyOnFailed: true });
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const resetPassword = async ({ resetPasswordData }) => {
  try {
    const response = await apiClient.post('resetpassword', resetPasswordData);
    const { status, data } = response;
    successHandler({ data, status }, { notifyOnSuccess: true, notifyOnFailed: true });
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const forgetPassword = async ({ email }) => {
  try {
    const response = await apiClient.post('auth/forgetpassword', { email });
    const { status, data } = response;
    successHandler({ data, status }, { notifyOnSuccess: true, notifyOnFailed: true });
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const isValidAuthToken = async () => {
  try {
    const authData = JSON.parse(localStorage.getItem('auth'));
    if (!authData?.token) throw new Error('No token found');
    const response = await apiClient.get('auth/validate');
    const { status, data } = response;
    return data.success;
  } catch (error) {
    return errorHandler(error);
  }
};

export const logout = async () => {
  try {
    const response = await apiClient.post('logout');
    const { status, data } = response;
    localStorage.removeItem('auth');
    console.log('Logged out, auth removed from localStorage');
    successHandler({ data, status }, { notifyOnSuccess: false, notifyOnFailed: true });
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export const updateProfile = async ({ entity, jsonData }) => {
  try {
    const response = await apiClient.put('auth/updateprofile', jsonData);
    const { status, data } = response;
    successHandler({ data, status }, { notifyOnSuccess: true, notifyOnFailed: true });
    return data;
  } catch (error) {
    return errorHandler(error);
  }
};

export default { login, register, verify, resetPassword, forgetPassword, isValidAuthToken, logout, updateProfile };
