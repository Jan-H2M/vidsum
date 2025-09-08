import { NextResponse } from 'next/server'
import { saveJobData, getJobData } from '@/lib/blob'
import { Job } from '@/lib/types'

export async function GET() {
  const testJobId = `test-${Date.now()}`
  const testJob: Job = {
    id: testJobId,
    status: 'queued',
    url: 'https://test.com',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    progress: 0
  }
  
  try {
    console.log('Step 1: Attempting to save job:', testJobId)
    await saveJobData(testJobId, testJob)
    console.log('Step 2: Job save completed')
    
    // Immediately try to retrieve it
    console.log('Step 3: Attempting to retrieve job')
    const retrieved = await getJobData(testJobId)
    console.log('Step 4: Retrieved job:', retrieved)
    
    return NextResponse.json({
      success: true,
      saved: testJob,
      retrieved,
      match: retrieved?.id === testJobId
    })
  } catch (error) {
    console.error('Test job error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}