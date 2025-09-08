import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET() {
  try {
    const { blobs } = await list()
    const jobBlobs = blobs.filter(b => b.pathname.startsWith('jobs/'))
    
    return NextResponse.json({
      totalBlobs: blobs.length,
      jobBlobs: jobBlobs.length,
      recentJobs: jobBlobs.slice(-10).map(b => ({
        path: b.pathname,
        url: b.url,
        downloadUrl: b.downloadUrl,
        uploadedAt: b.uploadedAt
      }))
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}