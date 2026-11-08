// Import this file first in an integration test: it makes every database connection in the process use a throwaway schema,
// so the real tables are never read or changed. The name includes the process id, so test files can run side by side.
export const TEST_SCHEMA = `orbit_test_${process.pid}`;

// The database reads this setting when each connection opens, and the app's own connection pool does too.
process.env.PGOPTIONS = `-c search_path=${TEST_SCHEMA}`;
