// frontend/src/auth/index.js
// Nate’s instruction from 04/01/2025: Export updateProfile to fix build warning
// Why: actions.js requires all auth service functions, missing updateProfile caused error
// How: Export all functions from auth.service.js
// Notes:
// - Purpose: Central export point for auth services, used by actions.js.
// - Connects to: auth.service.js (implementation), actions.js (consumer).
// - Hurdle: Build warning resolved by adding updateProfile (04/01/2025).
// Next: Test build, confirm no export warnings
export { login, register, verify, resetPassword, forgetPassword, isValidAuthToken, logout, updateProfile } from '@/auth/auth.service';
