import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/infrastructure/env";

function filePath(key: string) {
  if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/(320|640|960|1440)\.webp$/.test(key))
    throw new Error("INVALID_STORAGE_KEY");
  return resolve(env().UPLOAD_ROOT, key);
}
let client: S3Client | undefined;
function s3() {
  const c = env();
  return (client ??= new S3Client({
    endpoint: c.S3_ENDPOINT || undefined,
    region: c.S3_REGION,
    forcePathStyle: !!c.S3_ENDPOINT,
    credentials: {
      accessKeyId: c.S3_ACCESS_KEY_ID!,
      secretAccessKey: c.S3_SECRET_ACCESS_KEY!,
    },
  }));
}
export async function putImage(key: string, bytes: Buffer) {
  const c = env();
  if (c.STORAGE_DRIVER === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: c.S3_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: "image/webp",
      }),
    );
  } else {
    const path = filePath(key);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, bytes, { mode: 0o600 });
  }
}
export async function getImage(key: string) {
  const c = env();
  if (c.STORAGE_DRIVER === "s3") {
    const result = await s3().send(
      new GetObjectCommand({ Bucket: c.S3_BUCKET, Key: key }),
    );
    if (!result.Body) throw new Error("ASSET_NOT_FOUND");
    return Buffer.from(await result.Body.transformToByteArray());
  }
  return readFile(filePath(key));
}
export async function deleteImage(key: string) {
  const c = env();
  if (c.STORAGE_DRIVER === "s3") {
    await s3().send(new DeleteObjectCommand({ Bucket: c.S3_BUCKET, Key: key }));
  } else {
    try {
      await unlink(filePath(key));
    } catch (error) {
      if (!(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
  }
}
