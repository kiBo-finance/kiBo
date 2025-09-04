const toNextJsHandler = jest.fn(() => ({
  GET: jest.fn(),
  POST: jest.fn(),
}))

module.exports = {
  toNextJsHandler,
}
