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

    console.log(`Processing step ${message.step} for job ${message.jobId}`)

    await processVideoStep(message)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Worker error:', error)
    return NextResponse.json(
      { error: 'Worker processing failed' },
      { status: 500 }
    )
  }
}