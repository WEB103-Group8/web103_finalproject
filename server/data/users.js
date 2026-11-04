const cities = ["Dallas", "Plano", "Irving", "Richardson", "Frisco"];
const profileImages = [
  "https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=400&h=400&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=400&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=faces&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop&crop=faces&q=80",
];

const hosts = [
  ["Jordan Lee", "jordan.lee"],
  ["Avery Chen", "avery.chen"],
  ["Morgan Patel", "morgan.patel"],
  ["Taylor Brooks", "taylor.brooks"],
  ["Casey Nguyen", "casey.nguyen"],
];

const attendeeFirstNames = [
  "Riley", "Cameron", "Dakota", "Skyler", "Jamie",
  "Drew", "Quinn", "Reese", "Alex", "Sam",
];
const attendeeLastNames = [
  "Johnson", "Garcia", "Kim", "Williams", "Brown",
  "Davis", "Wilson", "Martinez", "Anderson", "Thomas",
];

const users = [
  ...hosts.map(([fullName, handle], index) => ({
    fullName,
    email: `${handle}@example.test`,
    city: cities[index],
    userImageUrl: profileImages[index % profileImages.length],
    userType: "host",
  })),
  ...Array.from({ length: 20 }, (_, index) => {
    const handle = `attendee${String(index + 1).padStart(2, "0")}`;
    return {
      fullName: `${attendeeFirstNames[index % attendeeFirstNames.length]} ${attendeeLastNames[index % attendeeLastNames.length]}`,
      email: `${handle}@example.test`,
      city: cities[index % cities.length],
      userImageUrl: profileImages[(index + hosts.length) % profileImages.length],
      userType: "attendee",
    };
  }),
];

export default users;
