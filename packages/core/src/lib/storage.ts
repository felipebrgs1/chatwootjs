import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Armazenamento de anexos (M4).
 *
 * Interface `StorageProvider` com backend `LocalStorageProvider` (disco,
 * suficiente para dev e single-instance compose). Para N≥2 réplicas ou
 * produção, implementar `S3StorageProvider` (MinIO/AWS S3) com a mesma
 * interface — os chamadores (`uploadMessageAttachment`) não mudam.
 */

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageProvider {
  save(data: Uint8Array, filename: string, contentType: string): Promise<StoredObject>;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), ".uploads");
const UPLOAD_URL_BASE = process.env.UPLOAD_URL_BASE ?? "/uploads";

export class LocalStorageProvider implements StorageProvider {
  async save(data: Uint8Array, filename: string, contentType: string): Promise<StoredObject> {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
    const key = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${safe}`;
    const path = join(UPLOAD_DIR, key);
    await mkdir(join(UPLOAD_DIR, key.split("/")[0]!), { recursive: true });
    await writeFile(path, data);
    return {
      key,
      url: `${UPLOAD_URL_BASE}/${key}`,
      size: data.byteLength,
      contentType,
    };
  }
}

let provider: StorageProvider | null = null;

export function storage(): StorageProvider {
  provider ??= new LocalStorageProvider();
  return provider;
}

export function setStorageProvider(next: StorageProvider): void {
  provider = next;
}
