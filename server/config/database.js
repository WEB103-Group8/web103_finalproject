import pg from "pg";
import "./dotenv.js";

// show clock times that have no timezone exactly as stored (the venue's local time) instead of letting Node shift them
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value) => value.replace(" ", "T"));

// give ids and map coordinates to the API as numbers instead of text
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, parseFloat);

const config = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
};

export const pool = new pg.Pool(config);
