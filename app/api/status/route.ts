import { NextRequest, NextResponse } from 'next/server'
import { StatusResponse, JobProgress, ProcessingStep } from '@/lib/types'
import { getJobData } from '@/lib/blob'

export async function GET(request: NextRequest) {
  try {
    console.log(`Status check for jobId at ${new Date().toISOString()}`)
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    const job = await getJobData(jobId)
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const steps = generateProcessingSteps(job.status)
    const progress = calculateProgress(job.status)
    const currentStep = getCurrentStep(job.status)

    const response: StatusResponse = {
      jobId: job.id,
      status: job.status,
      progress,
      currentStep,
      steps,
      estimatedTimeRemaining: calculateEstimatedTime(job.status, job.createdAt)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

function generateProcessingSteps(status: string): ProcessingStep[] {
  const steps: ProcessingStep[] = [
    { step: 'Transcription', status: 'pending' },
    { step: 'Keyframe Extraction', status: 'pending' },
    { step: 'Visual Analysis', status: 'pending' },
    { step: 'AI Summarization', status: 'pending' }
  ]

  switch (status) {
    case 'processing':
      steps[0].status = 'processing'
      break
    case 'summarizing':
      steps[0].status = 'completed'
      steps[1].status = 'completed'
      steps[2].status = 'completed'
      steps[3].status = 'processing'
      break
    case 'done':
      steps.forEach(step => step.status = 'completed')
      break
    case 'error':
      steps[0].status = 'error'
      break
  }

  return steps
}

function calculateProgress(status: string): number {
  switch (status) {
    case 'queued': return 0
    case 'processing': return 25
    case 'summarizing': return 85
    case 'done': return 100
    case 'error': return 0
    default: return 0
  }
}

function getCurrentStep(status: string): string {
  switch (status) {
    case 'queued': return 'In queue'
    case 'processing': return 'Processing video'
    case 'summarizing': return 'Generating summary'
    case 'done': return 'Complete'
    case 'error': return 'Error occurred'
    default: return 'Unknown'
  }
}

function calculateEstimatedTime(status: string, createdAt: number): number | undefined {
  const elapsed = Date.now() - createdAt
  
  switch (status) {
    case 'queued': return 300000 // 5 minutes
    case 'processing': return Math.max(180000 - elapsed, 30000) // 3 minutes remaining
    case 'summarizing': return Math.max(60000 - elapsed, 10000) // 1 minute remaining
    case 'done': return 0
    case 'error': return undefined
    default: return undefined
  }
}