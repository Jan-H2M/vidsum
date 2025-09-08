import { NextRequest, NextResponse } from 'next/server'
import { QueueMessage } from '@/lib/queue'
import { processVideoStep } from '@/lib/pipeline'

export async function POST(request: NextRequest) {
  try {
    // In simplified version, we don't verify signatures since we're not using external queue
    const body = await request.text()
    const message: QueueMessage = JSON.parse(body)

    if (!message.jobId || !message.step) {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      )
    }

    console.log(`Worker received: step ${message.step} for job ${message.jobId}`)

    // Process in background without awaiting
    processVideoStep(message).then(() => {
      console.log(`Worker completed: step ${message.step} for job ${message.jobId}`)
    }).catch(error => {
      console.error(`Worker failed: step ${message.step} for job ${message.jobId}`, error)
    })

    // Return immediately to allow background processing
    return NextResponse.json({ success: true, message: 'Processing started' })
  } catch (error) {
    console.error('Worker error:', error)
    return NextResponse.json(
      { error: 'Worker processing failed' },
      { status: 500 }
    )
  }
}