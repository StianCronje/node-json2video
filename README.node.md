# JSON2Video Node.js TypeScript API

A Node.js TypeScript API for creating videos from JSON data using FFmpeg. This is a conversion of the original Python Flask application to Node.js with TypeScript.

## Features

- **TypeScript**: Full type safety and modern JavaScript features
- **Express.js**: Fast, unopinionated web framework
- **Bull Queue**: Redis-based job queue for video processing
- **FFmpeg Integration**: Video processing using FFmpeg
- **Input Validation**: Comprehensive request validation using Joi
- **Security**: API key authentication and URL validation
- **Logging**: Structured logging with Winston
- **Docker Support**: Containerized deployment
- **Health Checks**: Built-in health monitoring

## API Endpoints

### GET /api/validate
Validates the API key provided in the `x-api-key` header.

**Headers:**
- `x-api-key`: Your API key

**Response:**
```json
{
  "message": "API key is valid"
}
```

### POST /create-video
Creates a video from the provided parameters.

**Headers:**
- `x-api-key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "record_id": "string",
  "input_url": "string",
  "webhook_url": "string (optional)",
  "framerate": "number",
  "duration": "number (max 60)",
  "cache": "boolean",
  "zoom": "number (-100 to 100)",
  "crop": "boolean",
  "output_width": "number",
  "output_height": "number"
}
```

**Response:**
```json
{
  "record_id": "string",
  "filename": "string",
  "message": "Video processing started",
  "input_height": "number",
  "input_width": "number",
  "output_height": "number",
  "output_width": "number"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Installation

### Prerequisites

- Node.js 18+
- Redis
- FFmpeg
- Docker (optional)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd json2video-node-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Redis:**
   ```bash
   redis-server
   ```

5. **Create required directories:**
   ```bash
   mkdir -p cache movies logs
   ```

6. **Run in development mode:**
   ```bash
   npm run dev
   ```

7. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

1. **Build and run with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.node.yml up --build
   ```

2. **Run in background:**
   ```bash
   docker-compose -f docker-compose.node.yml up -d
   ```

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.node.yml logs -f api
   ```

## Configuration

Environment variables can be set in `.env` file or as system environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `CACHE_DIR` | `cache` | Directory for cached input files |
| `MOVIES_DIR` | `movies` | Directory for output videos |
| `DEFAULT_ZOOM` | `0.002` | Default zoom level |
| `SCHEME` | `https` | URL scheme for webhook URLs |
| `PUBLIC_PORT` | `80` | Public port for webhook URLs |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis database number |
| `ALLOWED_DOMAINS` | `example.com,trusted.com` | Comma-separated allowed domains |
| `ALLOWED_IPS_*` | Various | Allowed IP addresses by region |
| `LOG_LEVEL` | `info` | Logging level |

## API Key Setup

1. Create directories for each API key in the `movies` directory:
   ```bash
   mkdir -p movies/your-api-key
   ```

2. The API validates that a directory exists for each API key before processing requests.

## Video Processing

The API uses FFmpeg to process videos with the following features:

- **Input Support**: Downloads images/videos from URLs
- **Cropping**: Optional cropping to fit output dimensions
- **Scaling**: Automatic scaling with padding to maintain aspect ratio
- **Zoom Effects**: Configurable zoom levels (-100 to 100)
- **Frame Rate Control**: Configurable output frame rate
- **Duration Control**: Videos up to 60 seconds
- **Format**: Outputs MP4 with H.264 encoding

## Queue Processing

Video processing is handled asynchronously using Bull queues:

- Jobs are queued immediately upon request
- Processing happens in the background
- Failed jobs are retried with exponential backoff
- Webhook notifications are sent upon completion

## Security Features

- **API Key Authentication**: Required for all endpoints
- **URL Validation**: Only allowed domains/IPs can be accessed
- **Input Validation**: Comprehensive request validation
- **File Size Limits**: 10MB maximum file size
- **Directory Traversal Protection**: Prevents path traversal attacks
- **CORS Configuration**: Configurable cross-origin requests
- **Helmet.js**: Security headers

## Monitoring

- **Health Checks**: Built-in health endpoint
- **Structured Logging**: JSON-formatted logs with Winston
- **Queue Monitoring**: Job status and error tracking
- **Docker Health Checks**: Container health monitoring

## Error Handling

The API provides detailed error responses:

- **400 Bad Request**: Invalid input data or parameters
- **401 Unauthorized**: Missing or invalid API key
- **404 Not Found**: Endpoint not found
- **500 Internal Server Error**: Server-side errors

## Development

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production server
- `npm test`: Run tests (when implemented)

### Project Structure

```
src/
├── config/          # Configuration management
├── logger/          # Logging setup
├── queue/           # Job queue processing
├── routes/          # API route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── validation/      # Input validation
└── index.ts         # Main application entry point
```

## Migration from Python Flask

This Node.js API maintains compatibility with the original Python Flask API:

- **Same endpoints**: `/api/validate` and `/create-video`
- **Same request/response format**: JSON payloads match exactly
- **Same validation rules**: All input validation preserved
- **Same FFmpeg processing**: Video processing logic maintained
- **Same security model**: API key authentication preserved

### Key Differences

- **Queue System**: Uses Bull (Redis) instead of Celery
- **Language**: TypeScript instead of Python
- **Framework**: Express.js instead of Flask
- **Logging**: Winston instead of Python logging
- **Validation**: Joi instead of jsonschema

## License

[Add your license here]
