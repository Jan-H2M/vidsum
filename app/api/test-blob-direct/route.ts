import { NextResponse } from 'next/server'
import { put, list } from '@vercel/blob'

export async function GET() {
  const testId = `direct-test-${Date.now()}`
  
  try {
    // Test 1: Check environment
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN
    console.log('Blob token exists:', hasToken)
    
    // Test 2: Try to save
    let saveResult = null
    let saveError = null
    try {
      const result = await put(`test/${testId}.json`, JSON.stringify({ test: true }), {
        access: 'public',
      })
      saveResult = result
      console.log('Save successful:', result)
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error)
      console.error('Save failed:', error)
    }
    
    // Test 3: Try to list
    let listResult = null
    let listError = null
    try {
      const { blobs } = await list()
      listResult = blobs.length
      console.log('List successful, found blobs:', blobs.length)
    } catch (error) {
      listError = error instanceof Error ? error.message : String(error)
      console.error('List failed:', error)
    }
    
    return NextResponse.json({
      hasToken,
      tokenPreview: process.env.BLOB_READ_WRITE_TOKEN ? 
        process.env.BLOB_READ_WRITE_TOKEN.substring(0, 20) + '...' : null,
      saveResult: saveResult ? {
        url: saveResult.url,
        pathname: saveResult.pathname
      } : null,
      saveError,
      listResult,
      listError,
      testId
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
    }, { status: 500 })
  }
}