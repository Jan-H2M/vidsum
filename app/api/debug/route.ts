import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT,
      LAMBDA_RUNTIME_DIR: process.env.LAMBDA_RUNTIME_DIR,
      AWS_REGION: process.env.AWS_REGION,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      CI: process.env.CI,
      hasBlob: !!process.env.BLOB_READ_WRITE_TOKEN
    },
    platform: process.platform,
    arch: process.arch
  })
}