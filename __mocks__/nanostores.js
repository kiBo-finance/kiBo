const atom = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  subscribe: jest.fn(),
}))

const map = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  setKey: jest.fn(),
  subscribe: jest.fn(),
}))

module.exports = {
  atom,
  map,
}
