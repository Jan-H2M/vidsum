import { NextRequest, NextResponse } from 'next/server'
import { IngestRequest, IngestResponse, Job } from '@/lib/types'
import { generateJobId, isValidUrl } from '@/lib/utils'
import { saveJobData } from '@/lib/blob'
import { enqueueTranscription } from '@/lib/queue'
import { ValidationError, handleApiError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body: IngestRequest = await request.json()
    
    if (!body.url || !isValidUrl(body.url)) {
      throw new ValidationError('Valid URL is required')
    }

    const jobId = generateJobId()
    const now = Date.now()
    
    const job: Job = {
      id: jobId,
      status: 'queued',
      url: body.url,
      createdAt: now,
      updatedAt: now,
      progress: 0
    }

    console.log('Attempting to save job:', jobId)
    await saveJobData(jobId, job)
    console.log('Job saved successfully, now enqueueing...')
    
    // Start background processing
    await enqueueTranscription(jobId, body.url)
    console.log('Job enqueued for processing')

    const response: IngestResponse = {
      jobId,
      status: 'queued'
    }

    return NextResponse.json(response)
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode }
    )
  }
}