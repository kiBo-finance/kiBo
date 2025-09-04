export const useAuth = jest.fn(() => ({
  user: null,
  session: null,
  isAuthenticated: false,
  authLoading: false,
  authError: null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}))
