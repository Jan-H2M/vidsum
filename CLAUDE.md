# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npx vercel --prod    # Deploy to production manually
```

## High-Level Architecture

### Core Processing Pipeline

The app follows a **job-based asynchronous processing pipeline**:

1. **Job Creation** (`/api/ingest`) → Creates job, saves to storage, enqueues processing
2. **Status Polling** (`/api/status`) → Frontend polls for job updates
3. **Background Processing** (`lib/pipeline.ts`) → Orchestrates transcription → vision → summarization
4. **Result Retrieval** (`/api/summary`) → Returns completed summary

### Storage Architecture Issue

**Critical Known Issue**: Blob storage retrieval is failing in production due to Vercel Blob adding random suffixes to filenames. The code in `lib/blob.ts` uses prefix matching to handle this, but there may be additional issues with blob permissions or deployment synchronization.

**Storage Modes**:
- **Development**: Local filesystem (`.vidsum-storage/`)
- **Production**: Vercel Blob storage (requires `BLOB_READ_WRITE_TOKEN`)
- **Fallback**: In-memory storage (doesn't persist across serverless function invocations)

### AI Service Integration

All AI services use **OpenAI only** (simplified from multi-provider):
- **Transcription**: `lib/stt.ts` - OpenAI Whisper API
- **Vision Analysis**: `lib/vision.ts` - GPT-4 Vision for keyframe analysis
- **Summarization**: `lib/llm.ts` - GPT-4 for generating structured summaries

### Key Architectural Patterns

1. **Queue System** (`lib/queue.ts`): Simple in-memory queue with `setImmediate` for background processing in serverless
2. **Error Handling** (`lib/errors.ts`): Centralized error types with retry logic
3. **Type Safety**: Strict TypeScript with comprehensive types in `lib/types.ts`
4. **Component Structure**: shadcn/ui components in `components/ui/`, main app components in root `components/`

## Critical Deployment Notes

### Vercel Deployment Issues

1. **Auto-deployment not working**: GitHub repo needs to be connected in Vercel dashboard under Settings → Git
2. **Multiple deployment URLs**: Each push creates preview deployments with different URLs. Use the main production URL from Vercel dashboard
3. **Environment Variables**: Must be set in Vercel dashboard, not just `.env.local`:
   - `OPENAI_API_KEY` (required)
   - `BLOB_READ_WRITE_TOKEN` (required for production)

### Current Production Issues

The main issue is **job creation succeeds but retrieval fails** (404 errors). This is likely due to:
- Blob storage save operations failing silently
- Preview deployments not having proper environment variables
- Serverless function isolation causing memory storage to not persist

## Testing and Debugging

### Diagnostic Endpoints

- `/api/debug` - Shows environment variables and runtime info
- `/api/test-storage` - Tests blob storage save/retrieve
- `/api/test-job` - Creates and retrieves a test job
- `/api/debug-blobs` - Lists all blobs in storage (if deployed)

### Vercel Function Logs

Always check Vercel dashboard → Functions → Logs when debugging production issues. Console logs from API routes appear there.

## Environment Setup

Required environment variables in `.env.local`:
```env
OPENAI_API_KEY=sk-proj-...  # Your OpenAI API key
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...  # From Vercel dashboard → Storage
```

## Known Issues and Solutions

1. **404 on job status**: Blob storage retrieval using prefix matching due to Vercel adding random suffixes
2. **EROFS errors**: Use memory or blob storage, never local filesystem in production
3. **Deployment not updating**: Check if using preview URL instead of main production URL
4. **Auto-deploy not working**: Connect GitHub repo in Vercel project settings