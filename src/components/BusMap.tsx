import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Clock } from "lucide-react";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const BusMap = ({ busPoints }: { busPoints: any[] }) => {
  return (
    <MapContainer center={[5.6037, -0.1870]} zoom={11} scrollWheelZoom={false} className="w-full h-full rounded-2xl z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {busPoints.map((bp: any) => (
        bp.lat && bp.lng && (
          <Marker key={bp.id} position={[bp.lat, bp.lng]}>
            <Popup className="font-body">
              <strong className="text-gold font-display text-base block mb-1">{bp.name}</strong>
              <span className="block mb-1">{bp.location}</span>
              <span className="text-muted-foreground font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> {bp.departure_time || "TBD"}</span>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};

export default BusMap;
