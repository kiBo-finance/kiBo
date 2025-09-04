const createAuthClient = jest.fn(() => ({
  useSession: jest.fn(() => ({
    data: null,
    isPending: false,
    error: null,
  })),
  signIn: {
    email: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
  signUp: {
    email: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
  signOut: jest.fn(() => Promise.resolve({ data: {}, error: null })),
  getSession: jest.fn(() => Promise.resolve({ data: null, error: null })),
  updateUser: jest.fn(() => Promise.resolve({ data: null, error: null })),
  sendVerificationEmail: jest.fn(() => Promise.resolve({ data: null, error: null })),
}))

module.exports = {
  createAuthClient,
}
