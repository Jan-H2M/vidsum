import { NextRequest, NextResponse } from 'next/server'
import { SummaryResponse } from '@/lib/types'
import { getJobData, getSummary } from '@/lib/blob'

export async function GET(request: NextRequest) {
  try {
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

    if (job.status !== 'done') {
      const response: SummaryResponse = {
        summary: null,
        error: `Job not complete. Current status: ${job.status}`
      }
      return NextResponse.json(response, { status: 202 })
    }

    const summary = await getSummary(jobId)
    
    if (!summary) {
      const response: SummaryResponse = {
        summary: null,
        error: 'Summary not found'
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: SummaryResponse = {
      summary
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Summary retrieval error:', error)
    return NextResponse.json(
      { 
        summary: null,
        error: 'Failed to retrieve summary' 
      },
      { status: 500 }
    )
  }
}