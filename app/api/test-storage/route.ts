import { NextResponse } from 'next/server'
import { saveJobData, getJobData } from '@/lib/blob'

export async function GET() {
  try {
    console.log('🧪 Testing storage system...')
    
    // Test job
    const testJob = {
      id: 'test-job-123',
      status: 'processing' as const,
      url: 'https://example.com/test',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    // Try to save
    console.log('🧪 Attempting to save test job...')
    await saveJobData(testJob.id, testJob)
    console.log('🧪 Save successful!')
    
    // Try to retrieve
    console.log('🧪 Attempting to retrieve test job...')
    const retrieved = await getJobData(testJob.id)
    console.log('🧪 Retrieve successful!')
    
    return NextResponse.json({
      success: true,
      message: 'Storage test passed!',
      savedJob: testJob,
      retrievedJob: retrieved,
      match: retrieved?.id === testJob.id
    })
  } catch (error) {
    console.error('🧪 Storage test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}