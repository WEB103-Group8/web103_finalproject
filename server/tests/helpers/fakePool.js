// A pretend database: each query gets the next prepared answer, and every query is remembered.
// An answer can be { rows, rowCount } or an Error to throw.
export function createFakePool(answers = []) {
  let next = 0;

  const pool = {
    calls: [],
    connects: 0,
    released: 0,
    async query(sql, values) {
      // Remember the query with its spaces tidied so tests can look for parts of it.
      pool.calls.push({ sql: sql.replace(/\s+/g, " ").trim(), values });
      const answer = answers[next++];
      if (answer instanceof Error) throw answer;
      const rows = answer?.rows ?? [];
      return { rows, rowCount: answer?.rowCount ?? rows.length };
    },
    async connect() {
      pool.connects += 1;
      // A borrowed connection runs queries the same way and is handed back with release().
      return {
        query: pool.query,
        release() {
          pool.released += 1;
        },
      };
    },
  };
  return pool;
}
