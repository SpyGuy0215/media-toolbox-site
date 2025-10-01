# Media Toolbox

A modern web UI for performing common media operations in the browser backed by an external API service. Current capabilities:

- Convert audio, video and image files between multiple formats
- Transcribe audio to subtitle or plain text formats using selectable Whisper models
- Live progress feedback over WebSocket including frames, speed, time and words where applicable
- Client side download of converted or generated files
- Clean responsive UI with drag and drop file input

## Tech Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- Radix UI primitives and custom UI components
- react hook form + zod for form state and validation
- WebSockets (react use websocket) for real time processing updates
- File uploads via REST to an external media processing API

## Features In Detail

### File Conversion
- Detects file type and offers compatible output formats
- Chooses appropriate audio and video codecs automatically based on target container
- Displays granular progress including fps frame speed and elapsed processing time when available

### Transcription
- Upload an audio file and choose a Whisper model (tiny thru small variants currently)
- Choose output format: SRT VTT TXT or ASS
- Automatically downloads the result when processing completes

## Project Structure (excerpt)
```
app/
  convert/        Conversion UI page
  transcribe/     Transcription UI page
  helper.js       Upload download and codec helper functions
  constants.js    API base URL and non fatal error patterns
components/
  Dropzone.js     Drag and drop file input wrapper
  Sidebar*        Navigation UI
  ui/*            Reusable UI primitives (button dialog progress etc.)
public/           Static assets
```

## Prerequisites

- Node.js 20+
- pnpm npm yarn or bun

## Running Locally

Install dependencies:
```
npm install
```
Start the dev server:
```
npm run dev
```
Visit http://localhost:3000

## Configuration

The API base URL is currently hard coded in `app/constants.js`:
```
export const BASE_API_URL = "https://api.media-toolbox.shashp.dev";
```
If you want to point to a different backend during development change this value or refactor to use an environment variable for example `process.env.NEXT_PUBLIC_BASE_API_URL`.

## Scripts
- dev: Start development server with Turbopack
- build: Production build
- start: Run production server
- lint: Run ESLint

## Adding New Formats or Codecs
1. Update helper logic that maps container formats to codecs (see `helper.js`)
2. Extend the selectable format lists inside the convert page component
3. Adjust backend to support the new format if needed

## Error Handling
- Certain known non fatal substrings are listed in `NONFATAL_ERRORS` and will not surface an error dialog
- All other errors during processing open a modal and allow the user to dismiss

## Browser Support Notes
- Uses modern APIs (File Blob WebSocket). Recent evergreen browsers recommended.

## Roadmap Ideas
- Batch conversions
- Trim and clip operations
- Audio normalization
- Waveform and subtitle preview
- Larger Whisper model options when backend adds support

## Contributing
Open a PR or file an issue. Keep PRs focused and small.

## License
Not specified. Add a LICENSE file if you intend to open source formally.

## Acknowledgments
- Next.js team for the framework
- OpenAI Whisper model ecosystem for transcription capability
