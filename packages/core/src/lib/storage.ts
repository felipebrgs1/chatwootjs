import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { S3Client } from "@aws-sdk/client-s3";

/**
 * Armazenamento de anexos.
 *
 * Interface `StorageProvider` com dois backends:
 * - `LocalStorageProvider` (disco) — padrão quando `S3_BUCKET` não está setado.
 * - `S3StorageProvider` (qualquer S3-compatível) — ativo quando `S3_BUCKET`
 *   está setado. Em produção aponte para AWS S3; em dev local use o RustFS
 *   do docker-compose (`S3_ENDPOINT=http://rustfs:9000`, path-style).
 *
 * Variáveis (nomes espelham o Chatwoot Rails + `S3_ENDPOINT` p/ compatíveis):
 *   S3_BUCKET, S3_ENDPOINT, S3_REGION, S3_FORCE_PATH_STYLE (default true),
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StoredBytes {
  body: Uint8Array;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  readonly name: "local" | "s3";
  save(data: Uint8Array, filename: string, contentType: string): Promise<StoredObject>;
  /** Lê de volta (servido pelo GET /uploads/:key do server). */
  read(key: string): Promise<StoredBytes | null>;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), ".uploads");
const UPLOAD_URL_BASE = process.env.UPLOAD_URL_BASE ?? "/uploads";

function safeName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

function objectKey(filename: string): string {
  return `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${safeName(filename)}`;
}

function safeKey(key: string): boolean {
  return !key.includes("..") && !key.startsWith("/") && key.length < 512;
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;

  async save(data: Uint8Array, filename: string, contentType: string): Promise<StoredObject> {
    const key = objectKey(filename);
    const path = join(UPLOAD_DIR, key);
    await mkdir(join(UPLOAD_DIR, key.split("/")[0]!), { recursive: true });
    await writeFile(path, data);
    return { key, url: `${UPLOAD_URL_BASE}/${key}`, size: data.byteLength, contentType };
  }

  async read(key: string): Promise<StoredBytes | null> {
    if (!safeKey(key)) return null;
    try {
      const body = await readFile(join(UPLOAD_DIR, key));
      return { body: new Uint8Array(body), contentType: "", size: body.byteLength };
    } catch {
      return null;
    }
  }
}

export class S3StorageProvider implements StorageProvider {
  readonly name = "s3" as const;

  private client: S3Client | null = null;
  private bucketReady: Promise<void> | null = null;

  constructor(
    private readonly bucket: string = process.env.S3_BUCKET ?? "",
    private readonly endpoint: string | undefined = process.env.S3_ENDPOINT || undefined,
    private readonly region: string = process.env.S3_REGION ??
      process.env.AWS_REGION ??
      "us-east-1",
    private readonly forcePathStyle: boolean = (process.env.S3_FORCE_PATH_STYLE ?? "true") !==
      "false",
  ) {
    if (!this.bucket) throw new Error("S3_BUCKET não configurado");
  }

  private async api(): Promise<S3Client> {
    if (!this.client) {
      const { S3Client } = await import("@aws-sdk/client-s3");
      this.client = new S3Client({
        endpoint: this.endpoint,
        region: this.region,
        forcePathStyle: this.forcePathStyle,
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
      });
    }
    return this.client;
  }

  /** Cria o bucket se não existir (idempotente; RustFS novo sobe vazio). */
  private ensureBucket(): Promise<void> {
    this.bucketReady ??= (async () => {
      const { HeadBucketCommand, CreateBucketCommand } = await import("@aws-sdk/client-s3");
      const client = await this.api();
      try {
        await client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      }
    })();
    return this.bucketReady;
  }

  async save(data: Uint8Array, filename: string, contentType: string): Promise<StoredObject> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await this.ensureBucket();
    const client = await this.api();
    const key = objectKey(filename);
    const put = () =>
      client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: data,
          ContentType: contentType || "application/octet-stream",
        }),
      );
    try {
      await put();
    } catch (err) {
      // Bucket removido externamente após o ensure: recria e retenta uma vez.
      if ((err as { Code?: string }).Code !== "NoSuchBucket") throw err;
      this.bucketReady = null;
      await this.ensureBucket();
      await put();
    }
    return { key, url: `${UPLOAD_URL_BASE}/${key}`, size: data.byteLength, contentType };
  }

  async read(key: string): Promise<StoredBytes | null> {
    if (!safeKey(key)) return null;
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const client = await this.api();
      const out = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await out.Body!.transformToByteArray();
      return {
        body: bytes,
        contentType: out.ContentType ?? "",
        size: Number(out.ContentLength ?? bytes.byteLength),
      };
    } catch {
      return null;
    }
  }
}

let provider: StorageProvider | null = null;

export function storage(): StorageProvider {
  provider ??= process.env.S3_BUCKET ? new S3StorageProvider() : new LocalStorageProvider();
  return provider;
}

export function setStorageProvider(next: StorageProvider): void {
  provider = next;
}
