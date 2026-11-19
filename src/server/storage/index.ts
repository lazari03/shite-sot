import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, PutObjectCommand, S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { env } from "@/env";

export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Delete every object under a prefix. */
  deletePrefix(prefix: string): Promise<void>;
  publicUrl(key: string): string;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]*$/i;
function assertKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error("Invalid storage key");
}

class LocalStorage implements StorageProvider {
  private root = path.resolve(env().LOCAL_STORAGE_DIR, "media");
  async put(key: string, body: Buffer) {
    assertKey(key);
    const file = path.join(this.root, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
  async deletePrefix(prefix: string) {
    assertKey(prefix);
    await rm(path.join(this.root, prefix), { recursive: true, force: true });
  }
  publicUrl(key: string) {
    return `/api/media/${key}`;
  }
  async read(key: string): Promise<Buffer | null> {
    assertKey(key);
    const file = path.join(this.root, key);
    if (!file.startsWith(this.root + path.sep)) return null;
    try {
      return await readFile(file);
    } catch {
      return null;
    }
  }
}

class S3Storage implements StorageProvider {
  private client = new S3Client({
    endpoint: env().S3_ENDPOINT,
    region: env().S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: env().S3_ACCESS_KEY_ID!, secretAccessKey: env().S3_SECRET_ACCESS_KEY! },
  });
  async put(key: string, body: Buffer, contentType: string) {
    assertKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: env().S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
        ContentDisposition: "inline",
      }),
    );
  }
  async deletePrefix(prefix: string) {
    assertKey(prefix);
    const list = await this.client.send(new ListObjectsV2Command({ Bucket: env().S3_BUCKET, Prefix: prefix.endsWith("/") ? prefix : prefix + "/" }));
    const objects = (list.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (objects.length) await this.client.send(new DeleteObjectsCommand({ Bucket: env().S3_BUCKET, Delete: { Objects: objects } }));
  }
  publicUrl(key: string) {
    return `${env().S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }
}

let instance: StorageProvider | undefined;
export function storage(): StorageProvider {
  instance ??= env().STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
  return instance;
}

export function localStorageDriver(): LocalStorage | null {
  const s = storage();
  return s instanceof LocalStorage ? s : null;
}
