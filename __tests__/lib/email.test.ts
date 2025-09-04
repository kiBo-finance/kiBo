import { sendEmail } from '@/lib/email'

// console.logをモック
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()

describe('email utility', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear()
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
  })

  it('should log email details to console in development', async () => {
    const emailOptions = {
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test message content',
    }

    await sendEmail(emailOptions)

    expect(mockConsoleLog).toHaveBeenCalledWith('📧 Email would be sent to:', 'test@example.com')
    expect(mockConsoleLog).toHaveBeenCalledWith('📧 Subject:', 'Test Subject')
    expect(mockConsoleLog).toHaveBeenCalledWith('📧 Content:', 'Test message content')
  })

  it('should handle HTML content', async () => {
    const emailOptions = {
      to: 'test@example.com',
      subject: 'HTML Test',
      html: '<h1>HTML Content</h1>',
    }

    await sendEmail(emailOptions)

    expect(mockConsoleLog).toHaveBeenCalledWith('📧 Email would be sent to:', 'test@example.com')
    expect(mockConsoleLog).toHaveBeenCalledWith('📧 Subject:', 'HTML Test')
    expect(mockConsoleLog).toHaveBeenCalledWith('📧 Content:', '<h1>HTML Content</h1>')
  })

  it('should prioritize text over html when both are provided', async () => {
    const emailOptions = {
      to: 'test@example.com',
      subject: 'Both Content Types',
      text: 'Text content',
      html: '<p>HTML content</p>',
    }

    await sendEmail(emailOptions)

    expect(mockConsoleLog).toHaveBeenCalledWith('📧 Content:', 'Text content')
  })
})
