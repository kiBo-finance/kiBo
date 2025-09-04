export const auth = {
  api: {
    getSession: jest.fn(async () => null),
    signInEmail: jest.fn(),
    signUpEmail: jest.fn(),
  },
  $Infer: {
    Session: {
      user: {
        id: '',
        email: '',
        name: '',
        emailVerified: false,
        baseCurrency: 'JPY',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: '',
        userId: '',
        expiresAt: new Date(),
        token: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  },
}
