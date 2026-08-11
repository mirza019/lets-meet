import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
const icon = L.divIcon({
  html: '<div style="font-size:28px">📍</div>',
  className: "",
  iconAnchor: [14, 28],
});
function Picker({
  position,
  onPick,
}: {
  position: [number, number];
  onPick: (p: [number, number]) => void;
}) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return <Marker position={position} icon={icon} />;
}
export function MeetMap({
  lat = 49.59,
  lng = 11.01,
  onPick,
}: {
  lat?: number;
  lng?: number;
  onPick: (p: [number, number]) => void;
}) {
  return (
    <MapContainer
      className="map"
      center={[lat, lng]}
      zoom={13}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Picker position={[lat, lng]} onPick={onPick} />
    </MapContainer>
  );
}
