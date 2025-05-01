// File path: C:\Users\nthorpe\Desktop\crm\idurar-erp-crm\frontend\src\hooks\useOnFetch.jsx

import { useState } from 'react';

export default function useOnFetch() {
  const [result, setResult] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const onFetch = async (callback) => {
    setIsLoading(true);
    setError(null); // Reset error state
    try {
      const data = await callback;
      setResult(data.result);
      if (data.success === true) {
        setIsSuccess(true);
      } else {
        setIsSuccess(false);
        setError(data.message || 'Request failed');
      }
    } catch (err) {
      setIsSuccess(false);
      setError(err.message || 'An error occurred');
      console.error('useOnFetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { onFetch, result, isSuccess, isLoading, error };
}
