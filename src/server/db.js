import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../..");

dotenv.config({ path: path.join(projectRoot, ".env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
throw new Error(
`DATABASE_URL is missing. Check the .env file at: ${path.join(projectRoot, ".env")}`
);
}

const isLocalDatabase =
/localhost|127.0.0.1/i.test(new URL(databaseUrl).hostname);

export const pool = new Pool({
connectionString: databaseUrl,
ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});
