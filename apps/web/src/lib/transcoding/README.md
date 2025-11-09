# External Transcoding Service Integration

This directory contains the provider-agnostic transcoding service integration for Kolla. It allows you to use any external transcoding service (including your custom one) without changing the core application logic.

## Architecture

```
Video Upload → R2 Storage → Transcoding Service → Webhook → Status Update
```

### Components

- **`types.ts`** - TypeScript interfaces and types for provider abstraction
- **`service.ts`** - Main transcoding service that manages providers
- **`config.ts`** - Environment-based configuration management
- **`providers/custom.ts`** - Implementation for custom transcoding services
- **Webhook Handler** - `/api/transcoding/webhook` endpoint for completion notifications

## Configuration

Set these environment variables:

```bash
# Required
TRANSCODING_PROVIDER=custom
TRANSCODING_WEBHOOK_BASE_URL=https://your-domain.com
TRANSCODING_CUSTOM_API_URL=https://your-transcoding-service.com/api
TRANSCODING_CUSTOM_API_KEY=your_api_key

# Optional (uses NEXTAUTH_URL as fallback for webhook base)
```

## Using Your Custom Transcoding Service

### 1. API Contract

Your transcoding service should implement these endpoints:

#### Submit Job
```http
POST /jobs
Content-Type: application/json
Authorization: Bearer {TRANSCODING_CUSTOM_API_KEY}

{
  "source": {
    "url": "https://presigned-url-to-source-video"
  },
  "output": {
    "type": "hls",
    "bucket": "your-r2-bucket",
    "prefix": "hls/teamId/eventId/clipId/",
    "credentials": {
      "accessKeyId": "...",
      "secretAccessKey": "...",
      "endpoint": "https://r2-endpoint"
    }
  },
  "webhook": {
    "url": "https://your-kolla-domain.com/api/transcoding/webhook",
    "events": ["job.completed", "job.failed"]
  },
  "metadata": {
    "clipId": 123
  }
}
```

**Response:**
```json
{
  "jobId": "unique-job-id-from-your-service"
}
```

#### Get Job Status (Optional)
```http
GET /jobs/{jobId}
Authorization: Bearer {TRANSCODING_CUSTOM_API_KEY}
```

**Response:**
```json
{
  "id": "job-id",
  "status": "processing", // or "completed", "failed", "queued"
  "progress": 45,
  "output": {
    "hlsUrl": "https://your-bucket.r2.dev/hls/path/master.m3u8"
  },
  "error": null
}
```

### 2. Webhook Format

Your service should send webhooks to the configured URL when jobs complete:

```http
POST /api/transcoding/webhook
Content-Type: application/json
X-Webhook-Signature: signature (optional)

{
  "jobId": "unique-job-id",
  "status": "completed", // or "failed"
  "output": {
    "hlsUrl": "https://your-bucket.r2.dev/hls/path/master.m3u8"
  },
  "error": null // or error message if failed
}
```

### 3. Customize the Provider

Edit `providers/custom.ts` to match your service's API format:

```typescript
// Modify the submitJob method
async submitJob(options: SubmitJobOptions): Promise<string> {
  const response = await fetch(`${this.config.apiUrl}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.config.apiKey}`,
    },
    body: JSON.stringify({
      // Adapt this to your service's expected format
      source_url: options.sourceUrl,
      output_config: {
        // Your service's output configuration
      }
    }),
  });

  const result = await response.json();
  return result.job_id; // Adjust based on your response format
}
```

## Flow

1. **Upload**: User uploads video → stored in R2 with status "uploaded"
2. **Submit**: Coach clicks "Process" → `enqueueProcessing` tRPC call
3. **Transcoding**: Service submits job to your API → status changes to "processing"
4. **Webhook**: Your service completes transcoding → sends webhook to Kolla
5. **Complete**: Webhook updates clip status to "ready" with HLS URL

## Testing

### Test Configuration
```bash
curl http://localhost:3000/api/transcoding/test
```

### Test Webhook
```bash
curl -X POST http://localhost:3000/api/transcoding/webhook \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-123", "status": "completed", "output": {"hlsUrl": "https://example.com/test.m3u8"}}'
```

## Adding Other Providers

To add support for services like Mux, Cloudflare Stream, etc.:

1. Create a new provider file (e.g., `providers/mux.ts`)
2. Implement the `TranscodingProvider` interface
3. Add configuration in `config.ts`
4. Update the factory in `service.ts`

Example:
```typescript
// providers/mux.ts
export class MuxTranscodingProvider implements TranscodingProvider {
  readonly name = "mux";
  
  async submitJob(options: SubmitJobOptions): Promise<string> {
    // Mux API integration
  }
}

// config.ts
providers: {
  mux: {
    accessToken: process.env.MUX_ACCESS_TOKEN,
    secretKey: process.env.MUX_SECRET_KEY,
  }
}
```

## Error Handling

- Failed uploads → status "failed" with `failReason`
- Invalid webhooks → logged and ignored
- Service errors → clip status remains "processing" (manual retry needed)

## Status Flow

```
uploaded → processing → ready/failed
              ↑           ↓
         (enqueueProcessing) (webhook)
```