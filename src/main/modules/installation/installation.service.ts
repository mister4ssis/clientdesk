import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface InstallationFile {
  installationId: string;
  createdAt: string;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InstallationService {
  private cachedInstallation: InstallationFile | null = null;

  constructor(private readonly userDataPath: string) {}

  getInstallationId(): string {
    return this.getInstallation().installationId;
  }

  getShortInstallationId(): string {
    const installationId = this.getInstallationId();

    return installationId.slice(0, 13);
  }

  private getInstallation(): InstallationFile {
    if (this.cachedInstallation) {
      return this.cachedInstallation;
    }

    const existing = this.readInstallationFile();

    if (existing) {
      this.cachedInstallation = existing;
      return existing;
    }

    const created: InstallationFile = {
      installationId: randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.writeInstallationFile(created);
    this.cachedInstallation = created;

    return created;
  }

  private readInstallationFile(): InstallationFile | null {
    const filePath = this.getFilePath();

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<InstallationFile>;

      if (typeof parsed.installationId === 'string' && uuidPattern.test(parsed.installationId)) {
        return {
          installationId: parsed.installationId,
          createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString()
        };
      }
    } catch {
      // A corrupt installation id is replaced by a new random identifier.
    }

    return null;
  }

  private writeInstallationFile(installation: InstallationFile): void {
    const directory = path.dirname(this.getFilePath());
    mkdirSync(directory, { recursive: true });
    const tempPath = `${this.getFilePath()}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(installation, null, 2)}\n`, 'utf8');
    renameSync(tempPath, this.getFilePath());
  }

  private getFilePath(): string {
    return path.join(this.userDataPath, 'installation', 'installation.json');
  }
}
