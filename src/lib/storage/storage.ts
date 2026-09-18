import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export type FileReference = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
};

export interface StorageProvider {
  upload(file: Buffer, fileName: string, mimeType: string): Promise<FileReference>;
  download(id: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }>;
  getUrl(storagePath: string): string;
}

// Local filesystem storage — swap for S3/R2 in production
class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.STORAGE_LOCAL_DIR ?? "./uploads";
  }

  async upload(file: Buffer, fileName: string, mimeType: string): Promise<FileReference> {
    const id = crypto.randomUUID();
    const hash = crypto.createHash("sha256").update(file).digest("hex");
    const ext = path.extname(fileName);
    const storageName = `${id}${ext}`;
    const dir = path.join(this.baseDir, "documents");

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, storageName), file);

    return {
      id,
      storagePath: `documents/${storageName}`,
      fileName,
      mimeType,
      fileSize: file.length,
      fileHash: hash,
    };
  }

  async download(storagePath: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const fullPath = path.join(this.baseDir, storagePath);
    const buffer = await fs.readFile(fullPath);
    return { buffer, mimeType: "application/octet-stream", fileName: path.basename(storagePath) };
  }

  getUrl(storagePath: string): string {
    return `/api/files/${storagePath}`;
  }
}

export const storage: StorageProvider = new LocalStorageProvider();
