# VidSum - AI Video Summarization (OpenAI Edition)

![Deploy Status](https://img.shields.io/badge/deploy-vercel-black)

A streamlined Next.js application that transforms video content into intelligent summaries using OpenAI's powerful AI services. Now simplified to use **only OpenAI** - no multiple API keys needed!

## ✨ What's New - Simplified Version

- **Single API Key**: Only need OpenAI API key - that's it!
- **Cost Effective**: OpenAI Whisper is ~100x cheaper than AssemblyAI
- **Better Integration**: All AI services from one provider
- **Local Development**: Works without external storage for testing
- **Easy Setup**: 2 minutes to get running

## Features

- **Multi-format Support**: YouTube videos, MP4, MOV, AVI, and any public video URLs
- **Smart Transcription**: OpenAI Whisper with word-level timestamps
- **Visual Analysis**: GPT-4 Vision for scene description and OCR
- **Intelligent Summaries**: GPT-4 for TL;DR, chapters, key points, action items, and Q&A
- **Real-time Processing**: Background processing with live status updates
- **Export & Share**: Markdown export and social sharing capabilities

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Serverless Functions
- **AI Services**: OpenAI (Whisper + GPT-4 + GPT-4 Vision)
- **Storage**: Local files (dev) / Vercel Blob (production)
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

You only need **ONE** API key:
1. [OpenAI API Key](https://platform.openai.com/api-keys) - Get $5 free credit for new accounts

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/vidsum.git
cd vidsum
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment:
```bash
cp .env.example .env.local
```

4. Add your OpenAI API key to `.env.local`:
```env
OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

That's it! 🎉

## 💰 Cost Breakdown

With OpenAI's competitive pricing:

- **Whisper (Transcription)**: $0.006/minute (vs AssemblyAI $0.65/hour = ~$0.011/minute)
- **GPT-4 Vision (Visual Analysis)**: ~$0.01-0.03 per image
- **GPT-4 (Summarization)**: ~$0.01-0.05 per summary

**Example**: A 10-minute YouTube video costs approximately $0.10-0.20 total.

## 🎯 How It Works

### Processing Pipeline

1. **Video Input**: User submits YouTube URL or direct video link
2. **Smart Transcription**: 
   - YouTube videos: Try free captions first, fallback to Whisper
   - Other videos: OpenAI Whisper with word-level timestamps
3. **Visual Analysis**: Extract keyframes → GPT-4 Vision describes scenes
4. **AI Summarization**: GPT-4 combines audio + visual data into structured summary

### What You Get

```json
{
  "tldr": "Concise summary of the entire video",
  "key_points": ["Important", "takeaways", "from", "video"],
  "chapters": [
    {
      "title": "Introduction",
      "start": 0,
      "end": 30000,
      "bullets": ["Key points from this section"]
    }
  ],
  "action_items": ["Next steps", "if applicable"],
  "qa": [
    {
      "question": "Common question viewers might have",
      "answer": "AI-generated answer based on video content",
      "timestamp": 120000
    }
  ],
  "visual_moments": [
    {
      "timestamp": 60000,
      "title": "Slide Change",
      "description": "Presentation slide showing quarterly results"
    }
  ]
}
```

## 📂 Project Structure

```
vidsum/
├── app/
│   ├── api/
│   │   ├── ingest/route.ts      # Start video processing
│   │   ├── status/route.ts      # Check processing status
│   │   ├── summary/route.ts     # Get completed summary
│   │   └── worker/route.ts      # Background processing
│   ├── layout.tsx
│   └── page.tsx                 # Main UI
├── lib/
│   ├── llm.ts                   # OpenAI GPT-4 integration
│   ├── stt.ts                   # OpenAI Whisper integration
│   ├── vision.ts                # GPT-4 Vision integration
│   ├── queue.ts                 # Simple background processing
│   ├── blob.ts                  # Local/cloud storage
│   ├── pipeline.ts              # Processing orchestration
│   └── types.ts                 # TypeScript definitions
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── JobStatus.tsx           # Processing status display
│   └── SummaryView.tsx         # Results presentation
└── .env.local                   # Your API key
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables:
   ```
   OPENAI_API_KEY=your_key
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token (optional)
   ```
4. Deploy!

### Environment Variables

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key

**Optional (Production):**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob for persistent storage

## 🎮 Usage

1. **Submit Video**: Paste any YouTube URL or direct video link
2. **Watch Progress**: Real-time status with processing steps
3. **Explore Results**: 
   - Expandable summary sections
   - Click timestamps to jump to YouTube moments
   - Export as Markdown
   - Share summaries

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linting
npm run typecheck    # TypeScript type checking
npm run test         # Run tests
```

### Local Storage

In development, the app uses local file storage (`.vidsum-storage/`) instead of cloud storage. This makes testing free and fast.

## 🎯 Supported Formats

- ✅ YouTube videos (any public video)
- ✅ MP4 direct links
- ✅ MOV, AVI, WebM (any format Whisper supports)
- ✅ Any publicly accessible video URL

## 🔧 Advanced Configuration

### YouTube-Only Mode (Free for many videos)

For YouTube videos with existing captions, the app uses the free YouTube transcript API first, only falling back to Whisper if needed.

### Custom Processing

You can modify the processing pipeline in `lib/pipeline.ts` to:
- Adjust keyframe extraction frequency
- Customize GPT-4 prompts
- Add additional analysis steps
- Integrate other OpenAI models

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run `npm run typecheck && npm run lint`
5. Commit: `git commit -am 'Add feature'`
6. Push: `git push origin feature-name`
7. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & FAQ

### Common Issues

**Q: "No API key provided" error**  
A: Make sure your `.env.local` file has `OPENAI_API_KEY=sk-proj-...` with your actual key.

**Q: Processing takes too long**  
A: For very long videos, consider the OpenAI API rate limits. The app automatically retries with exponential backoff.

**Q: YouTube video fails**  
A: Some YouTube videos have restrictions. Try with a different public video or direct MP4 link.

**Q: High costs**  
A: Monitor usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage). Whisper is very affordable at $0.006/minute.

### Getting Help

- 🐛 [Report bugs](https://github.com/your-username/vidsum/issues)
- 💡 [Request features](https://github.com/your-username/vidsum/issues)
- 📧 Email: your-email@domain.com

---

**Built with ❤️ using Next.js, TypeScript, and OpenAI**

*Simplicity is the ultimate sophistication.* ✨