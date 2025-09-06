import { 
  formatDuration, 
  formatTimestamp, 
  isValidUrl, 
  isYouTubeUrl,
  generateJobId,
  createYouTubeTimestampUrl 
} from '@/lib/utils'

describe('formatDuration', () => {
  test('formats duration correctly', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(30000)).toBe('0:30')
    expect(formatDuration(90000)).toBe('1:30')
    expect(formatDuration(3600000)).toBe('1:00:00')
    expect(formatDuration(3690000)).toBe('1:01:30')
  })
})

describe('isValidUrl', () => {
  test('validates URLs correctly', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://example.com')).toBe(true)
    expect(isValidUrl('https://youtube.com/watch?v=123')).toBe(true)
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })
})

describe('isYouTubeUrl', () => {
  test('identifies YouTube URLs correctly', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=123')).toBe(true)
    expect(isYouTubeUrl('https://youtube.com/watch?v=123')).toBe(true)
    expect(isYouTubeUrl('https://youtu.be/123')).toBe(true)
    expect(isYouTubeUrl('https://example.com/video.mp4')).toBe(false)
  })
})

describe('generateJobId', () => {
  test('generates unique job IDs', () => {
    const id1 = generateJobId()
    const id2 = generateJobId()
    
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
    expect(typeof id1).toBe('string')
  })
})

describe('createYouTubeTimestampUrl', () => {
  test('adds timestamp to YouTube URLs', () => {
    const originalUrl = 'https://www.youtube.com/watch?v=123'
    const timestampMs = 90000 // 90 seconds
    
    const result = createYouTubeTimestampUrl(originalUrl, timestampMs)
    expect(result).toContain('t=90')
  })
  
  test('handles youtu.be URLs', () => {
    const originalUrl = 'https://youtu.be/123'
    const timestampMs = 30000 // 30 seconds
    
    const result = createYouTubeTimestampUrl(originalUrl, timestampMs)
    expect(result).toContain('t=30')
  })
  
  test('returns original URL if invalid', () => {
    const originalUrl = 'invalid-url'
    const timestampMs = 90000
    
    const result = createYouTubeTimestampUrl(originalUrl, timestampMs)
    expect(result).toBe(originalUrl)
  })
})