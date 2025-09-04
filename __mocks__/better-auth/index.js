const betterAuth = jest.fn(() => ({
  api: {
    getSession: jest.fn(() => Promise.resolve(null)),
    signInEmail: jest.fn(),
    signUpEmail: jest.fn(),
  },
  $Infer: {
    Session: {},
  },
}))

const prismaAdapter = jest.fn(() => ({}))

module.exports = {
  betterAuth,
  prismaAdapter,
}
