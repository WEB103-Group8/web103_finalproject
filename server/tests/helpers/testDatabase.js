// Builds the real tables and data inside the throwaway schema, and removes it afterwards.
import { pool } from "../../config/database.js";
import { TABLES, createTables, seedTable, syncIdCounter } from "../../config/reset.js";
import { TEST_SCHEMA } from "./useTestSchema.js";

// Stop unless this connection really is inside the throwaway schema, so nothing real can be dropped by mistake.
async function assertInTestSchema(client) {
  const { rows } = await client.query("SELECT current_schema() AS schema");
  if (rows[0].schema !== TEST_SCHEMA) {
    throw new Error(`Refusing to continue: the connection is in schema "${rows[0].schema}", not "${TEST_SCHEMA}".`);
  }
}

// Create the tables and fill them from the data files, exactly like the real reset does.
export async function fillTestSchema(client) {
  await createTables(client);
  for (const table of TABLES) {
    await seedTable(client, table);
    await syncIdCounter(client, table);
  }
}

// Create the throwaway schema and fill it.
export async function setUpTestDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${TEST_SCHEMA}`);
    await assertInTestSchema(client);

    await client.query("BEGIN");
    await fillTestSchema(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Remove the throwaway schema and close every connection so the test process can finish.
export async function tearDownTestDatabase() {
  const client = await pool.connect();
  try {
    await assertInTestSchema(client);
    await client.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
  } finally {
    client.release();
    await pool.end();
  }
}

export { pool, TABLES };
