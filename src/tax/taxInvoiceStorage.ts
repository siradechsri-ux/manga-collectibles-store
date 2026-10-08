import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface TaxInvoiceStorage {
  save(storageKey: string, contents: Buffer): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
}

export interface LocalTaxInvoiceStorageOptions {
  rootDirectory: string;
}

export class LocalTaxInvoiceStorage implements TaxInvoiceStorage {
  private readonly rootDirectory: string;

  constructor(options: LocalTaxInvoiceStorageOptions) {
    this.rootDirectory = path.resolve(options.rootDirectory);
  }

  async save(storageKey: string, contents: Buffer): Promise<void> {
    const targetPath = this.resolvePath(storageKey);
    await mkdir(path.dirname(targetPath), { recursive: true });
    const temporaryPath = `${targetPath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, contents, { flag: "wx" });
      await rename(temporaryPath, targetPath);
    } catch (error) {
      try {
        await unlink(temporaryPath);
      } catch (cleanupError) {
        if (
          !(cleanupError instanceof Error) ||
          !("code" in cleanupError) ||
          cleanupError.code !== "ENOENT"
        ) {
          console.error("Failed to clean up an incomplete tax invoice PDF.", cleanupError);
        }
      }
      throw error;
    }
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolvePath(storageKey));
  }

  private resolvePath(storageKey: string): string {
    if (
      !storageKey ||
      storageKey.includes("\0") ||
      path.isAbsolute(storageKey) ||
      storageKey.split(/[\\/]/).some((segment) => segment === "." || segment === "..")
    ) {
      throw new TypeError("Tax invoice storage key is invalid.");
    }
    const resolvedPath = path.resolve(this.rootDirectory, storageKey);
    const relativePath = path.relative(this.rootDirectory, resolvedPath);
    if (
      relativePath === "" ||
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      throw new TypeError("Tax invoice storage key escapes the configured storage directory.");
    }
    return resolvedPath;
  }
}
