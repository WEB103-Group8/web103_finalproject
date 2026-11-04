const attendeeEmails = Array.from(
  { length: 20 },
  (_, index) => `attendee${String(index + 1).padStart(2, "0")}@example.test`,
);

const rsvps = Array.from({ length: 50 }, (_, eventIndex) =>
  Array.from({ length: 3 }, (_, offset) => ({
    attendeeEmail: attendeeEmails[(eventIndex * 3 + offset * 7) % attendeeEmails.length],
    eventIndex,
    rsvpStatus: "attending",
  })),
).flat();

export default rsvps;
