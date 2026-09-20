"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface GeoPoint {
  village: string; // "District / Block / Village"
  gaps: number;
  max_priority: number;
  level: string;
}

/** MP district centres — demo pins are deterministically scattered around them. */
const CENTRES: Record<string, [number, number]> = {
  bhopal: [23.2599, 77.4126],
  indore: [22.7196, 75.8577],
  gwalior: [26.2183, 78.1828],
  ujjain: [23.1765, 75.7885],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function coordsFor(key: string): [number, number] {
  const district = key.split("/")[0].trim().toLowerCase();
  const [lat, lng] = CENTRES[district] ?? CENTRES.bhopal;
  const h1 = hash(key);
  const h2 = hash(key.split("").reverse().join(""));
  const dLat = ((h1 % 1000) / 1000 - 0.5) * 0.5;
  const dLng = ((h2 % 1000) / 1000 - 0.5) * 0.5;
  return [lat + dLat, lng + dLng];
}

const COLOR: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };

/** Village gap heatmap on a real map (demo coordinates, deterministic per village). */
export default function VillageMap({ points }: { points: GeoPoint[] }) {
  const markers = points.map((p) => ({ ...p, at: coordsFor(p.village) }));
  const center: [number, number] =
    markers.length > 0
      ? [markers.reduce((a, m) => a + m.at[0], 0) / markers.length,
         markers.reduce((a, m) => a + m.at[1], 0) / markers.length]
      : CENTRES.bhopal;

  return (
    <MapContainer center={center} zoom={7} scrollWheelZoom={false}
      style={{ height: "340px", width: "100%", borderRadius: "0.75rem", zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <CircleMarker key={m.village} center={m.at}
          radius={6 + Math.min(10, m.gaps * 2)}
          pathOptions={{ color: COLOR[m.level] ?? "#64748b", fillColor: COLOR[m.level] ?? "#64748b", fillOpacity: 0.55, weight: 2 }}>
          <Popup>
            <b>{m.village}</b><br />
            {m.gaps} gap{m.gaps === 1 ? "" : "s"} · max priority {m.max_priority} ({m.level})
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
