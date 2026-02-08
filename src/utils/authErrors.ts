const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
};

export function getAuthErrorMessage(error: any): string {
  if (error?.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  if (error?.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
