const eventTypes = [
  "Technology",
  "Arts",
  "Food",
  "Outdoors",
  "Career",
  "Community",
  "Music",
  "Wellness",
  "Education",
  "Games",
];
const eventTopics = [
  "Creative Coding",
  "Neighborhood Book Club",
  "Intro to Pottery",
  "DFW Product Meetup",
  "Community Garden Day",
  "Board Game Social",
  "Local Food Workshop",
  "Trail Walk and Cleanup",
  "Indie Music Showcase",
  "Portfolio Review",
];
const locations = [
  "Dallas Arts District, Dallas",
  "Legacy West, Plano",
  "Toyota Music Factory, Irving",
  "CityLine, Richardson",
  "The Star, Frisco",
];
const eventImages = [
  "https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&h=600&fit=crop&q=80",
];

const events = Array.from({ length: 50 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 10, 7 + index * 2));
  const startHour = 9 + ((index * 3) % 10);
  const online = index % 4 === 3;
  return {
    hostEmail: `${["jordan.lee", "avery.chen", "morgan.patel", "taylor.brooks", "casey.nguyen"][index % 5]}@example.test`,
    eventTitle: `${eventTopics[index % eventTopics.length]} ${String(index + 1).padStart(2, "0")}`,
    eventStartTime: `${String(startHour).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}:00`,
    eventDate: date.toISOString().slice(0, 10),
    eventDuration: [60, 90, 120, 150][index % 4],
    eventImageUrl: eventImages[index % eventImages.length],
    eventLocation: online ? null : locations[index % locations.length],
    onlineLinkUrl: null,
    eventType: eventTypes[index % eventTypes.length],
  };
});

export default events;
