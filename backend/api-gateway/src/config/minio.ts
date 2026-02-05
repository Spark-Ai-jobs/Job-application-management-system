import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'spark_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'spark_secret_key',
});

const BUCKETS = {
  RESUMES: 'resumes',
  DOCUMENTS: 'documents',
};

export async function initMinio() {
  // Create buckets if they don't exist
  for (const bucket of Object.values(BUCKETS)) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
      console.log(`Created bucket: ${bucket}`);
    }
  }
}

export const minio = {
  // Upload a file
  upload: async (
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> => {
    await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });

    // Return the URL
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    return `http://${endpoint}:${port}/${bucket}/${objectName}`;
  },

  // Get a file
  get: async (bucket: string, objectName: string): Promise<Buffer> => {
    const stream = await minioClient.getObject(bucket, objectName);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  },

  // Delete a file
  delete: async (bucket: string, objectName: string): Promise<void> => {
    await minioClient.removeObject(bucket, objectName);
  },

  // Generate presigned URL for download
  getPresignedUrl: async (
    bucket: string,
    objectName: string,
    expirySeconds = 3600
  ): Promise<string> => {
    return minioClient.presignedGetObject(bucket, objectName, expirySeconds);
  },

  // Generate presigned URL for upload
  getPresignedPutUrl: async (
    bucket: string,
    objectName: string,
    expirySeconds = 3600
  ): Promise<string> => {
    return minioClient.presignedPutObject(bucket, objectName, expirySeconds);
  },

  // List objects in bucket
  list: async (bucket: string, prefix?: string): Promise<Minio.BucketItem[]> => {
    const objects: Minio.BucketItem[] = [];
    const stream = minioClient.listObjects(bucket, prefix, true);

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => objects.push(obj));
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  },

  // Check if object exists
  exists: async (bucket: string, objectName: string): Promise<boolean> => {
    try {
      await minioClient.statObject(bucket, objectName);
      return true;
    } catch {
      return false;
    }
  },

  BUCKETS,
  client: minioClient,
};
