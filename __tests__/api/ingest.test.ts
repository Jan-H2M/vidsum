import { POST } from '@/app/api/ingest/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/blob', () => ({
  saveJobData: jest.fn(),
}))

jest.mock('@/lib/queue', () => ({
  enqueueTranscription: jest.fn(),
}))

jest.mock('@/lib/utils', () => ({
  generateJobId: jest.fn(() => 'test-job-id'),
  isValidUrl: jest.fn((url: string) => url.startsWith('http')),
}))

describe('/api/ingest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully processes valid URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jobId).toBe('test-job-id')
    expect(data.status).toBe('queued')
  })

  test('rejects invalid URL', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      body: JSON.stringify({ url: 'invalid-url' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Valid URL is required')
  })

  test('rejects empty request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Valid URL is required')
  })
})