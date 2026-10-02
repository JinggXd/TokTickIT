export interface RecoveryOptions {
  databaseUrl: string;
  uploadDir: string;
  outputDir: string;
  pgDump?: string;
  pgRestore?: string;
  psql?: string;
}
export interface RecoveryResult {
  sourceDatabase: string;
  restoredDatabase: string;
  retainedForInspection: boolean;
  databaseMatched: boolean;
  filesMatched: boolean;
  tables: Array<{ name: string; count: number; sha256: string }>;
  schemaSha256: string;
  sequencesSha256: string;
  files: Array<{ path: string; sha256: string }>;
  dumpSha256: string;
  dumpVersion: string;
  restoreVersion: string;
  serverVersion: number;
  restoreMethod: string;
  durationMs: number;
}
export function validateRecoveryTarget(databaseUrl: string, uploadDir: string, outputDir: string): { url: URL; name: string };
export function verifyRecovery(options: RecoveryOptions): Promise<RecoveryResult>;
