import { useEffect, useRef } from "react";
import L from "leaflet";
import { CAMPUS_CENTER, BUILDINGS } from "../data.js";

const pinIcon = L.divIcon({
  className: "pin-icon",
  html: "<span></span>",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Real OpenStreetMap of the campus.
// pin    = [lat, lng] of the problem (optional)
// onPick = called with [lat, lng] when the user clicks the map (optional)
// focus  = [lat, lng] to fly the map to (optional)
export default function CampusMap({ pin, onPick, focus, height = 340 }) {
  const el = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const m = L.map(el.current, { center: pin || CAMPUS_CENTER, zoom: 17, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);

    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--map-stroke").trim() || "#2a1a5e";
    const acc = css.getPropertyValue("--map-fill").trim() || "#2de2c5";

    BUILDINGS.forEach((b) =>
      L.circleMarker([b.lat, b.lng], { radius: 7, color: ink, weight: 2, fillColor: acc, fillOpacity: 1 })
        .bindTooltip(b.name, { permanent: true, direction: "right", offset: [8, 0], className: "b-label" })
        .addTo(m)
    );

    m.on("click", (e) => {
      if (pickRef.current) pickRef.current([e.latlng.lat, e.latlng.lng]);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (marker.current) { marker.current.remove(); marker.current = null; }
    if (pin) marker.current = L.marker(pin, { icon: pinIcon }).addTo(m);
  }, [pin]);

  useEffect(() => {
    if (map.current && focus) map.current.flyTo(focus, 18, { duration: 0.6 });
  }, [focus]);

  return <div ref={el} className="map" style={{ height, cursor: onPick ? "crosshair" : "grab" }} />;
}
