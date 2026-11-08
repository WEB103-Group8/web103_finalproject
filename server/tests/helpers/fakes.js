// These helpers are shared by the tests and never use the network or the database.

// Fake logged-in users, one for each role we need to test.
export const fakeUsers = {
  // Nobody is logged in.
  anonymous: null,
  // Someone who logged in with GitHub but has not finished onboarding yet.
  newUser: { isNewUser: true, github_id: "999", github_username: "newbie" },
  // A normal attendee.
  attendee: { user_id: 1, full_name: "Test Attendee", user_type: "attendee", city: "Austin", state: "TX" },
  // A host.
  host: { user_id: 2, full_name: "Test Host", user_type: "host", city: "Austin", state: "TX" },
  // A second host, used to check that hosts cannot edit each other's things.
  otherHost: { user_id: 3, full_name: "Other Host", user_type: "host", city: "Denver", state: "CO" },
};

// Build a fake address lookup that answers from a small list instead of the internet.
export function createFakeGeocoder(answers = {}) {
  // Remember every address that was looked up so tests can check it.
  const calls = [];

  const geocode = async (address) => {
    calls.push(address);
    const answer = answers[address];

    // Pretend the lookup service is down.
    if (answer === "unavailable") {
      const error = new Error("Address lookup unavailable");
      error.code = "GEOCODER_UNAVAILABLE";
      throw error;
    }

    // Pretend the address could not be found.
    if (!answer) {
      const error = new Error("Address not found");
      error.code = "ADDRESS_NOT_FOUND";
      throw error;
    }

    // Return a copy so tests cannot change the original answer by accident.
    return { ...answer };
  };

  // Let tests read the list of addresses that were looked up.
  geocode.calls = calls;
  return geocode;
}

// One known-good address and the answer the fake lookup gives for it.
export const sampleAddress = {
  address: "500 W 2nd St, Austin, TX 78701",
  result: {
    city: "Austin",
    state: "TX",
    postal_code: "78701",
    latitude: 30.265,
    longitude: -97.7491,
  },
};
