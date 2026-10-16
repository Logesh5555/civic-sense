import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STATUS_META, categoryShort } from '../utils/constants.js';

// Default view when no data: a neutral city-scale view (configurable via env).
const DEFAULT_CENTER = [Number(import.meta.env.VITE_MAP_DEFAULT_LAT) || 13.0827, Number(import.meta.env.VITE_MAP_DEFAULT_LNG) || 80.2707];
export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const dotIcon = (color, size = 18) => L.divIcon({ className: '', html: `<div class="ct-marker" style="background:${color};width:${size}px;height:${size}px"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });

function Recenter({ pos, zoom }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, Math.max(map.getZoom(), zoom)); }, [pos?.[0], pos?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Interactive picker: click map or drag marker. value = { lat, lng } | null */
export function MapPicker({ value, onChange, height = 320 }) {
  const pos = value ? [value.lat, value.lng] : null;
  const icon = useMemo(() => dotIcon('#14a39a', 22), []);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300" style={{ height }}>
      <MapContainer center={pos || DEFAULT_CENTER} zoom={pos ? 16 : 12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} aria-label="Map for selecting issue location">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
        <ClickHandler onPick={(lat, lng) => onChange({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) })} />
        {pos && <Marker position={pos} icon={icon} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onChange({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }); } }} />}
        <Recenter pos={pos} zoom={16} />
      </MapContainer>
    </div>
  );
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 16 });
  }, [points.map((p) => p.join(',')).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Static single-location display. */
export function LocationMap({ lat, lng, status = 'submitted', height = 240 }) {
  const icon = useMemo(() => dotIcon(STATUS_META[status]?.color || '#64748b', 22), [status]);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
      <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} aria-label="Complaint location map">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
        <Marker position={[lat, lng]} icon={icon} />
      </MapContainer>
    </div>
  );
}

/** Many markers, colored by status, popups with reference/category/status. */
export function ComplaintsMap({ items, height = 520, linkBase }) {
  const points = items.map((c) => [c.location.coordinates[1], c.location.coordinates[0]]);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
      <MapContainer center={points[0] || DEFAULT_CENTER} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }} aria-label="Map of complaints">
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
        <FitBounds points={points} />
        {items.map((c) => (
          <Marker key={c.id} position={[c.location.coordinates[1], c.location.coordinates[0]]} icon={dotIcon(STATUS_META[c.status]?.color || '#64748b')}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{c.referenceNumber}</p>
                <p>{categoryShort(c.category)}</p>
                <p>Status: {STATUS_META[c.status]?.label}</p>
                {linkBase && <a href={`${linkBase}/${c.id}`} className="mt-1 inline-block text-teal-700 underline">View details</a>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
