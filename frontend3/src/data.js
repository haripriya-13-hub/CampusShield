// Constants used by the UI. Reports now come from the Flask backend.

export const STEPS = ["Pending", "In Progress", "Fixed"];
export const COLUMN_LABEL = { "Pending": "To-Do", "In Progress": "Doing", "Fixed": "Done" };
export const DEPARTMENTS = ["IT", "Maintenance", "Security"];

// Campus centre (Coimbatore Institute of Engineering and Technology, Narasipuram).
export const CAMPUS_CENTER = [10.9955, 76.7734];

// Building positions are placeholders around the centre.
// To make them exact: right-click a building in Google Maps, copy the lat/lng, paste here.
export const BUILDINGS = [
  { name: "Library",   lat: 10.9959, lng: 76.7729 },
  { name: "Block A",   lat: 10.9951, lng: 76.7728 },
  { name: "Hostel B",  lat: 10.9949, lng: 76.7741 },
  { name: "Canteen",   lat: 10.9956, lng: 76.7735 },
  { name: "Parking",   lat: 10.9961, lng: 76.7740 },
  { name: "Main Gate", lat: 10.9946, lng: 76.7733 },
];
