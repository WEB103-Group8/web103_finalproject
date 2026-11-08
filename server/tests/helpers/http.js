// A pretend response object that remembers what the controller sent back.
export function createRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    ended: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(body) {
      res.body = body;
      return res;
    },
    send() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

// Hide the expected error messages a test provokes, so the test output stays readable.
export async function withQuietErrors(run) {
  const original = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = original;
  }
}
