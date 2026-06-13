import pg from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import dns from "dns";
import { promisify } from "util";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Client } = pg;

async function clearDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  // Configure custom DNS servers for direct resolution
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  const resolve4 = promisify(dns.resolve4);

  let client;
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const originalHost = dbUrl.hostname;
    const originalUser = dbUrl.username;
    const originalPassword = decodeURIComponent(dbUrl.password);
    const originalDatabase = dbUrl.pathname.slice(1);
    
    // Bypass PgBouncer pooler and connect directly to direct compute endpoint
    // ep-odd-sun-an7kf9j1-pooler.c-6.us-east-1.aws.neon.tech -> ep-odd-sun-an7kf9j1.c-6.us-east-1.aws.neon.tech
    const directHost = originalHost.replace('-pooler', '');
    const endpointId = directHost.split('.')[0]; // ep-odd-sun-an7kf9j1
    
    console.log(`Resolving direct hostname ${directHost} using custom DNS...`);
    const ips = await resolve4(directHost);
    if (!ips || ips.length === 0) {
      throw new Error(`Failed to resolve host: ${directHost}`);
    }
    const resolvedIp = ips[0];
    console.log(`Resolved to IP: ${resolvedIp}`);

    console.log(`Connecting to pg Client using IP ${resolvedIp} and options project=${endpointId}`);

    client = new Client({
      host: resolvedIp,
      port: 5432,
      user: originalUser,
      password: originalPassword,
      database: originalDatabase,
      options: `project=${endpointId}`,
      ssl: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined, // skip hostname/IP mismatch validation
      }
    });

    await client.connect();
    console.log("Connected to PostgreSQL successfully.");

    // Query total database size before clearing
    let dbSizeRes = await client.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size;");
    console.log(`Current Total Database Size: ${dbSizeRes.rows[0].size}`);

    console.log("Truncating all tables...");
    
    // TRUNCATE resets all rows, RESTART IDENTITY resets primary key IDs to 1, CASCADE handles foreign keys.
    await client.query("TRUNCATE TABLE sale_items, sales, customers, products RESTART IDENTITY CASCADE;");
    
    console.log("\x1b[32m%s\x1b[0m", "Database cleared successfully! All products, customers, sales history, and credit records have been permanently deleted, and primary IDs have been reset to 1.");
    
    // Query total database size after clearing
    dbSizeRes = await client.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size;");
    console.log(`\nNew Total Database Size: ${dbSizeRes.rows[0].size}`);

    // Query each table's row count and size in the public schema
    const tablesRes = await client.query(`
      SELECT 
          pg_class.relname AS table_name, 
          n_live_tup AS row_count,
          pg_size_pretty(pg_total_relation_size(pg_class.oid)) AS total_size
      FROM 
          pg_class 
      JOIN 
          pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
      LEFT JOIN
          pg_stat_user_tables ON pg_stat_user_tables.relid = pg_class.oid
      WHERE 
          nspname = 'public' 
          AND relkind = 'r'
      ORDER BY 
          pg_total_relation_size(pg_class.oid) DESC;
    `);

    console.log("\nTable Breakdown:");
    console.table(tablesRes.rows);

  } catch (error: any) {
    console.error("Failed to connect or query database:", error.stack || error);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

clearDatabase();
