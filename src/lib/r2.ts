import "server-only";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`${name} is not set`);
  }
  return v.trim();
}

function getR2Endpoint(): string {
  const explicit = process.env.R2_ENDPOINT?.trim();
  if (explicit) return explicit;
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (!accountId) {
    throw new Error(
      "R2_ENDPOINT or R2_ACCOUNT_ID is required for R2 (S3) client"
    );
  }
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: getR2Endpoint(),
      credentials: {
        accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export function getR2BucketName(): string {
  return requiredEnv("R2_BUCKET_NAME");
}

const DEFAULT_PUT_EXPIRES = 900; // 15 minutes
const DEFAULT_GET_EXPIRES = 3600; // 1 hour

export async function presignPutUrl(params: {
  key: string;
  contentType?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });
  return getSignedUrl(s3, cmd, {
    expiresIn: params.expiresInSeconds ?? DEFAULT_PUT_EXPIRES,
  });
}

export async function presignGetUrl(params: {
  key: string;
  expiresInSeconds?: number;
  /** e.g. inline streaming vs attachment */
  responseContentDisposition?: string;
}): Promise<string> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ...(params.responseContentDisposition
      ? { ResponseContentDisposition: params.responseContentDisposition }
      : {}),
  });
  return getSignedUrl(s3, cmd, {
    expiresIn: params.expiresInSeconds ?? DEFAULT_GET_EXPIRES,
  });
}

export async function headObject(
  key: string
): Promise<{ contentLength?: number; contentType?: string } | null> {
  try {
    const out = await getR2Client().send(
      new HeadObjectCommand({
        Bucket: getR2BucketName(),
        Key: key,
      })
    );
    return {
      contentLength:
        typeof out.ContentLength === "number" ? out.ContentLength : undefined,
      contentType:
        typeof out.ContentType === "string" ? out.ContentType : undefined,
    };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export function sanitizeFilenameForKey(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/^\.+/, "");
  const safe = base.replace(/[^\w.\-()+]/gi, "_").slice(0, 200);
  return safe.length > 0 ? safe : "audio";
}
