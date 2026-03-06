# S3 Service

A robust, type-safe S3 abstraction layer using AWS SDK v3.

## Features

- ✅ Full CRUD operations (get, put, delete, list, head)
- ✅ Tombstone support for soft deletes
- ✅ Presigned URLs for client-offload
- ✅ Multipart uploads for large files
- ✅ Comprehensive error types
- ✅ AbortSignal support for cancellation
- ✅ S3-compatible service support (MinIO, LocalStack)

## Installation

Dependencies are included in the main project. The service uses:
- `@aws-sdk/client-s3` - Core S3 client
- `@aws-sdk/s3-request-presigner` - Presigned URL generation
- `@smithy/node-http-handler` - Custom HTTP handler with timeouts

## Quick Start

```typescript
import { S3Service } from './services/s3';

const s3 = new S3Service({
  region: 'us-east-1',
  bucket: 'my-bucket',
  // Optional: for MinIO/LocalStack
  endpoint: 'http://localhost:9000',
});

// Upload a file
await s3.putObject({
  key: 'documents/contract.pdf',
  body: buffer,
  contentType: 'application/pdf',
  metadata: { author: 'nexus' },
});

// Get the file
const file = await s3.getObject({ key: 'documents/contract.pdf' });
console.log(file.body.toString());

// Soft delete (mark as deleted without removing)
await s3.softDelete({
  key: 'documents/contract.pdf',
  reason: 'Expired contract',
});

// Get presigned URL for client download
const url = await s3.getPresignedUrl({
  operation: 'getObject',
  key: 'documents/contract.pdf',
  expiresIn: 3600, // 1 hour
});

// Cleanup (important!)
await s3.destroy();
```

## Configuration

```typescript
interface S3Config {
  region: string;       // AWS region (e.g., 'us-east-1')
  bucket: string;       // Bucket name
  endpoint?: string;    // Optional: for local S3-compatible services
}
```

When `endpoint` is provided, the service automatically switches to path-style URLs, which is required for MinIO and similar services.

## Core Operations

### Object Management

```typescript
// Get object
const object = await s3.getObject({ key: 'path/to/file.txt' });
console.log(object.contentType);  // 'text/plain'
console.log(object.metadata);     // { custom: 'value' }

// Upload with options
await s3.putObject({
  key: 'path/to/file.txt',
  body: Buffer.from('content'),
  contentType: 'text/plain',
  storageClass: 'GLACIER',  // Optional: STANDARD, GLACIER, etc.
  metadata: { key: 'value' },
});

// Check existence
const exists = await s3.objectExists('path/to/file.txt');

// Get metadata only (cheaper)
const metadata = await s3.headObject({ key: 'path/to/file.txt' });

// Delete (hard delete)
await s3.deleteObject({ key: 'path/to/file.txt' });
```

### Listing Objects

```typescript
// List with pagination
const result = await s3.listObjects({
  prefix: 'documents/',
  maxKeys: 100,
  delimiter: '/',
});

for (const obj of result.objects) {
  console.log(`${obj.key}: ${obj.size} bytes`);
}

// Navigate folders
for (const prefix of result.commonPrefixes) {
  console.log(`Folder: ${prefix.prefix}`);
}

// Continue to next page
if (result.isTruncated) {
  const nextPage = await s3.listObjects({
    prefix: 'documents/',
    continuationToken: result.nextContinuationToken,
  });
}
```

## Tombstone (Soft Delete) Pattern

The tombstone pattern allows marking objects as deleted without actually removing them. This provides:
- Audit trail of deletions
- Ability to restore deleted content
- Safe deletion (graceful)

```typescript
// Mark as deleted (creates tombstone marker)
const softDeleteResult = await s3.softDelete({
  key: 'important-file.txt',
  reason: 'User requested deletion',
});

console.log(softDeleteResult.tombstoneKey);
// Output: '.tombstone/1704067200000/aW1wb...'

// List all tombstones
const tombstones = await s3.listTombstones();
for (const tomb of tombstones.tombstones) {
  console.log(`Deleted: ${tombstone.originalKey} at ${tombstone.deletedAt}`);
}

// Restore from tombstone
await s3.restore({ key: 'important-file.txt' });

// Permanent cleanup (remove tombstone marker)
await s3.purgeTombstone(softDeleteResult.tombstoneKey);
```

**Note**: Tombstone markers are stored in the `.tombstone/` prefix. These are excluded from normal list operations unless `includeDeleted: true` is set.

## Presigned URLs

Presigned URLs allow clients to directly upload/download without server throughtput:

```typescript
// Generate download URL (valid for 1 hour)
const getUrl = await s3.getPresignedUrl({
  operation: 'getObject',
  key: 'report.pdf',
  expiresIn: 3600,
});
// Returns: { url: "https://...", expiresIn: 3600, expiresAt: Date }

// Generate upload URL
const putUrl = await s3.getPresignedUrl({
  operation: 'putObject',
  key: 'client-upload.bin',
  expiresIn: 600,
  contentType: 'application/octet-stream',
});

// Client can now directly PUT to putUrl.url
```

## Multipart Upload

Multipart uploads allow streaming large files and resumable uploads:

```typescript
// 1. Initiate
const { uploadId, key } = await s3.createMultipartUpload({
  key: 'large-dump.sql',
  contentType: 'application/sql',
});

// 2. Upload parts
const parts = [];
for (let i = 1; i <= 3; i++) {
  const partBuffer = Buffer.from(`part ${i} content`);
  const { etag, partNumber } = await s3.uploadPart({
    key,
    uploadId,
    partNumber: i,
    body: partBuffer,
  });
  parts.push({ partNumber, etag });
}

// 3. Complete
const result = await s3.completeMultipartUpload({
  key,
  uploadId,
  parts, // Parts are sorted automatically
});

// Or abort if needed
await s3.abortMultipartUpload({ key, uploadId });
```

## Error Handling

The S3 service provides typed errors for different failure modes:

```typescript
try {
  await s3.getObject({ key: 'missing.txt' });
} catch (error) {
  if (error instanceof ObjectNotFoundError) {
    console.log('File not found');
  } else if (error instanceof AccessDeniedError) {
    console.log('Insufficient permissions');
  } else if (error instanceof BucketNotFoundError) {
    console.log('Bucket does not exist');
  } else if (error instanceof S3ServiceError) {
    console.log('S3 operation failed:', error.code, error.operation);
    console.log('Original:', error.originalError);
  }
}
```

### Error Types

- `S3ServiceError` - Base error class
- `ObjectNotFoundError` - Key does not exist
- `BucketNotFoundError` - Bucket does not exist
- `AccessDeniedError` - Insufficient permissions
- `TombstoneError` - Object was soft-deleted

## Cancellation Support

All operations support AbortSignal for cancellation:

```typescript
const controller = new AbortController();

// Start upload
const uploadPromise = s3.putObject({
  key: 'large-file.bin',
  body: largeBuffer,
  abortSignal: controller.signal,
});

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  await uploadPromise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Upload was cancelled');
  }
}
```

## Working with Local S3 (MinIO, LocalStack)

```typescript
const localS3 = new S3Service({
  region: 'us-east-1',  // Required but can be anything for local
  bucket: 'my-bucket',
  endpoint: 'http://localhost:9000',  // MinIO default
});

// All operations work identically
await localS3.putObject({
  key: 'test.txt',
  body: 'Hello',
});
```

## Resource Cleanup

Always call `destroy()` to release connections:

```typescript
const s3 = new S3Service(config);
try {
  // ... use service
} finally {
  await s3.destroy();
}
```

Without proper destruction, the S3 client may keep HTTP connections alive, preventing the Node.js process from exiting.

## Design Decisions

### Buffer-based I/O

The service returns Buffer objects rather than streams. This simplifies usage for the majority of cases where files fit in memory. For streaming large files, the AWS SDK provides alternative methods that can be wrapped if needed.

### Tombstone Pattern

We use a prefix-based tombstone instead of S3's native delete markers because:
- Works with all S3-compatible services (some don't support versioning)
- Allows storing rich metadata about the deletion
- Enables listing/filtering tombstones by original key prefix

### Error Translation

AWS SDK errors are translated to domain-specific errors with:
- Consistent error codes
- Original error preserved for debugging
- Operation context for better logging

## Testing

Tests mock the AWS SDK rather than requiring actual S3 access:

```bash
# Run S3 tests only
TEST_ACTIVE_LOCK=1 NODE_ENV=test npx vitest run src/services/s3/s3.service.test.ts
```

For integration testing with real S3 or LocalStack, create a separate integration test file that imports the service and tests against actual endpoints.

## Migration from AWS SDK v2

If migrating from v2:

1. Constructor changed: `new AWS.S3()` → `new S3Service(config)`
2. `getObject` returns `{ body: Buffer, ... }` instead of `{ Body: Stream }`
3. Errors are typed: check with `instanceof` instead of `error.code`
4. `s3.listObjectsV2` → `s3.listObjects` (same params, different return shape)
5. Call `await s3.destroy()` when done

## Version

```typescript
import { S3_SERVICE_VERSION } from './services/s3';
console.log(S3_SERVICE_VERSION); // '1.0.0'
```
