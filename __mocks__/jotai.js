const atom = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  subscribe: jest.fn(),
}))

const useAtom = jest.fn(() => [null, jest.fn()])
const useAtomValue = jest.fn(() => null)
const useSetAtom = jest.fn(() => jest.fn())

module.exports = {
  atom,
  useAtom,
  useAtomValue,
  useSetAtom,
}
