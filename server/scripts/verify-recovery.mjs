import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { PrismaClient, Prisma } from "@prisma/client";

const uploadRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../test-uploads");
const digest = value => createHash("sha256").update(value).digest("hex");
const quote = value => `"${value.replaceAll('"', '""')}"`;
const serialize = value => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);

export function validateRecoveryTarget(databaseUrl, uploadDir, outputDir) {
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || !/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(name) || (url.searchParams.get("schema") ?? "public") !== "public") {
    throw new Error("Recovery requires an explicit local disposable public-schema test database.");
  }
  const relative = path.relative(uploadRoot, path.resolve(uploadDir));
  const outputRelative = path.relative(path.resolve(uploadDir), path.resolve(outputDir));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)
      || !outputRelative || path.dirname(path.resolve(outputDir)) !== path.resolve(uploadDir)) {
    throw new Error("Recovery files must stay inside one isolated server/test-uploads run directory.");
  }
  return { url, name };
}

async function tool(binary, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const chunks = [];
    const errors = [];
    child.stdout.on("data", chunk => chunks.push(chunk));
    // Never print connection environment, database contents or native error text.
    child.stderr.on("data", chunk => errors.push(chunk));
    child.on("error", () => reject(new Error(`Unable to start ${path.basename(binary)}; configure the PostgreSQL binary path.`)));
    child.on("exit", code => {
      if (code === 0) return resolve(Buffer.concat(chunks).toString("utf8"));
      const diagnostic = Buffer.concat(errors).toString("utf8");
      const reason = diagnostic.includes("transaction_timeout") ? "unsupported transaction_timeout setting"
        : /schema .* already exists/.test(diagnostic) ? "schema already exists"
        : /permission denied/i.test(diagnostic) ? "permission denied" : "native PostgreSQL command error";
      reject(new Error(`${path.basename(binary)} failed with exit code ${code}: ${reason}.`));
    });
  });
}

async function snapshot(db) {
  const tables = await db.$queryRawUnsafe(`SELECT tablename AS name FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const rows = [];
  for (const { name } of tables) {
    const data = await db.$queryRawUnsafe(`SELECT to_jsonb(t)::text AS row FROM public.${quote(name)} t ORDER BY to_jsonb(t)::text`);
    rows.push({ name, count: data.length, sha256: digest(serialize(data)) });
  }
  const columns = await db.$queryRawUnsafe(`SELECT table_name,column_name,ordinal_position,column_default,is_nullable,data_type,udt_name
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`);
  const constraints = await db.$queryRawUnsafe(`SELECT c.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,con.conname`);
  const indexes = await db.$queryRawUnsafe(`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`);
  const enums = await db.$queryRawUnsafe(`SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`);
  const sequenceNames = await db.$queryRawUnsafe(`SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`);
  const sequences = [];
  for (const { sequencename } of sequenceNames) {
    const [state] = await db.$queryRawUnsafe(`SELECT last_value,is_called FROM public.${quote(sequencename)}`);
    sequences.push({ name: sequencename, ...state });
  }
  // Include active and soft-removed rows from the same snapshot as the dump.
  const attachmentReferences = await db.$queryRawUnsafe(`SELECT "storedFileName", "fileSize" FROM public."Attachment" ORDER BY "id"`);
  return { tables: rows, schemaSha256: digest(serialize({ columns, constraints, indexes, enums })), sequencesSha256: digest(serialize(sequences)), attachmentReferences };
}

function verifyAttachmentReferences(references, files, location) {
  const byPath = new Map(files.map(file => [file.path, file]));
  for (const reference of references) {
    const file = byPath.get(reference.storedFileName);
    if (!file || file.size !== reference.fileSize) {
      throw new Error(`Attachment reference is missing or has incorrect size in ${location} uploads.`);
    }
  }
}

async function filesIn(directory, excluded, prefix = "") {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (filename === excluded) continue;
    if (entry.isSymbolicLink()) throw new Error("Recovery refuses symlinked upload files.");
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(filename, excluded, relative));
    else if (entry.isFile()) {
      const bytes = await fs.readFile(filename);
      result.push({ path: relative, size: bytes.length, sha256: digest(bytes) });
    }
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}

export async function verifyRecovery({ databaseUrl, uploadDir, outputDir, pgDump = "pg_dump", pgRestore = "pg_restore", psql }) {
  const { url, name } = validateRecoveryTarget(databaseUrl, uploadDir, outputDir);
  const realUpload = await fs.realpath(uploadDir), realRoot = await fs.realpath(uploadRoot);
  const realRelative = path.relative(realRoot, realUpload);
  if (!realRelative || realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    throw new Error("Recovery refuses an upload directory resolving outside server/test-uploads.");
  }
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: name,
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password) };
  const dumpVersion = (await tool(pgDump, ["--version"], env)).trim();
  const restoreVersion = (await tool(pgRestore, ["--version"], env)).trim();
  const source = new PrismaClient({ datasources: { db: { url: url.href } } });
  let target;
  const restoreDatabase = `toktickit_test_restore_${Date.now()}_${randomUUID().slice(0, 8)}`;
  try {
    const [actual] = await source.$queryRawUnsafe("SELECT current_database() AS name");
    if (actual.name !== name) throw new Error("Recovery source database identity mismatch.");
    const [server] = await source.$queryRawUnsafe("SELECT current_setting('server_version_num')::int AS version");
    const output = path.resolve(outputDir);
    const files = await filesIn(path.resolve(uploadDir), output);
    // Reject existing evidence directories instead of overwriting a previous backup.
    await fs.mkdir(output);
    const backupFiles = path.join(output, "backup-uploads");
    await fs.mkdir(backupFiles);
    for (const file of files) {
      const destination = path.join(backupFiles, file.path);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(path.join(uploadDir, file.path), destination);
    }
    if (serialize(files) !== serialize(await filesIn(backupFiles, ""))) throw new Error("Attachment backup bytes differ.");
    const archive = path.join(output, "database.dump");
    const started = Date.now();
    const before = await source.$transaction(async tx => {
      const state = await snapshot(tx);
      verifyAttachmentReferences(state.attachmentReferences, files, "source");
      const [exported] = await tx.$queryRawUnsafe("SELECT pg_export_snapshot() AS snapshot");
      await tool(pgDump, ["--format=custom", "--schema=public", "--no-owner", "--no-privileges",
        `--snapshot=${exported.snapshot}`, `--file=${archive}`], env);
      return state;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 120000 });
    // A fresh database is restored without --clean, DROP or overwriting any existing DB.
    await source.$executeRawUnsafe(`CREATE DATABASE ${quote(restoreDatabase)} TEMPLATE template0`);
    const targetUrl = new URL(url.href); targetUrl.pathname = `/${restoreDatabase}`;
    target = new PrismaClient({ datasources: { db: { url: targetUrl.href } } });
    const [targetIdentity] = await target.$queryRawUnsafe("SELECT current_database() AS name");
    if (targetIdentity.name !== restoreDatabase) throw new Error("Recovery destination identity mismatch.");
    const [contents] = await target.$queryRawUnsafe("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'");
    if (contents.n !== 0) throw new Error("Recovery destination is not empty.");
    // template0 already contains an empty public schema. Reuse it without DROP;
    // retain every table, index, constraint, sequence, comment and data entry.
    const toc = await tool(pgRestore, ["--list", archive], env);
    const listPath = path.join(output, "restore.list");
    await fs.writeFile(listPath, toc.split("\n").filter(line => !/^\d+;\s+\d+\s+\d+\s+SCHEMA - public\s/.test(line)).join("\n"));
    const restoreArgs = ["--no-owner", "--no-privileges", `--use-list=${listPath}`];
    const targetEnv = { ...env, PGDATABASE: restoreDatabase };
    let restoreMethod = "pg_restore --dbname --single-transaction";
    if (server.version < 170000 && Number(restoreVersion.match(/\) (\d+)/)?.[1]) >= 17) {
      // New clients emit this session setting even when dumping an older server.
      // Restore every SQL object/row unchanged; only remove the unsupported SET.
      const sqlPath = path.join(output, "restore.sql");
      await tool(pgRestore, [...restoreArgs, `--file=${sqlPath}`, archive], env);
      const sql = await fs.readFile(sqlPath, "utf8");
      await fs.writeFile(sqlPath, sql.replace(/^SET transaction_timeout = 0;\r?\n/m, ""));
      const psqlBinary = psql ?? path.join(path.dirname(pgRestore), process.platform === "win32" ? "psql.exe" : "psql");
      await tool(psqlBinary, ["--no-psqlrc", "--set=ON_ERROR_STOP=1", "--single-transaction", "--quiet", `--file=${sqlPath}`], targetEnv);
      restoreMethod = "pg_restore SQL + psql --single-transaction; omitted unsupported SET transaction_timeout=0";
    } else {
      await tool(pgRestore, [...restoreArgs, "--exit-on-error", "--single-transaction", `--dbname=${restoreDatabase}`, archive], targetEnv);
    }
    const after = await snapshot(target);
    if (serialize(before) !== serialize(after)) throw new Error("Restored schema, rows or sequence state differ from the backup.");
    if (serialize(before) !== serialize(await snapshot(source))) throw new Error("Source changed during recovery verification; rerun without concurrent writers.");
    const recoveredFiles = path.join(output, "uploads");
    await fs.mkdir(recoveredFiles);
    for (const file of files) {
      const destination = path.join(recoveredFiles, file.path);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(path.join(backupFiles, file.path), destination);
    }
    const restoredFiles = await filesIn(recoveredFiles, "");
    verifyAttachmentReferences(after.attachmentReferences, restoredFiles, "restored");
    if (serialize(files) !== serialize(restoredFiles)) throw new Error("Recovered attachment bytes differ.");
    if (serialize(files) !== serialize(await filesIn(path.resolve(uploadDir), output))) {
      throw new Error("Source upload files changed during recovery verification; rerun without concurrent writers.");
    }
    return { sourceDatabase: name, restoredDatabase: restoreDatabase, retainedForInspection: true,
      databaseMatched: true, filesMatched: true, referencedFilesMatched: true, referencedAttachmentCount: before.attachmentReferences.length,
      tables: before.tables, schemaSha256: before.schemaSha256,
      sequencesSha256: before.sequencesSha256, files, dumpSha256: digest(await fs.readFile(archive)),
      dumpVersion, restoreVersion, serverVersion: server.version, restoreMethod, durationMs: Date.now() - started };
  } finally {
    await source.$disconnect();
    if (target) await target.$disconnect();
  }
}
