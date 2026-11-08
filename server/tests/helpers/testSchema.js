// This helper gives integration tests their own throwaway schema so real tables are never touched.
// It uses the app's existing database pool and settings, so there is nothing new to configure.
import { pool } from "../../config/database.js";

// The default name of the throwaway schema.
export const TEST_SCHEMA = "orbit_test";

// Stop right away if the schema name could ever point at real data.
function assertSafe(schema) {
  if (!/^orbit_test[a-z0-9_]*$/.test(schema)) {
    throw new Error(`Refusing to use schema "${schema}": test schemas must start with orbit_test`);
  }
}

// Make a fresh empty test schema and return a database client that only sees it.
export async function createTestSchema(schema = TEST_SCHEMA) {
  assertSafe(schema);

  // Take one connection from the pool.
  const client = await pool.connect();

  // Remove the test schema if a failed run left it behind, then create a clean one.
  await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await client.query(`CREATE SCHEMA ${schema}`);

  // Point this connection at the test schema so queries cannot reach the real tables.
  await client.query(`SET search_path TO ${schema}`);
  return client;
}

// Delete the test schema and give the connection back.
export async function dropTestSchema(client, schema = TEST_SCHEMA) {
  assertSafe(schema);
  try {
    // Leave the test schema first, then drop it.
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  } finally {
    // Always return the connection, even if the drop failed.
    client.release();
  }
}

// Close all database connections so the test process can exit.
export async function closePool() {
  await pool.end();
}
