import {
  Car,
  CircleDot,
  Clock,
  Dumbbell,
  MapPin,
  Ruler,
  ShowerHead,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export const LOCATION_AMENITY_ICON_OPTIONS = [
  { key: "dumbbell", label: "운동 시설", icon: Dumbbell },
  { key: "shower", label: "샤워 시설", icon: ShowerHead },
  { key: "map-pin", label: "위치", icon: MapPin },
  { key: "car", label: "주차", icon: Car },
  { key: "wifi", label: "와이파이", icon: Wifi },
  { key: "clock", label: "운영 시간", icon: Clock },
  { key: "users", label: "그룹", icon: Users },
  { key: "ruler", label: "규격", icon: Ruler },
  { key: "circle-dot", label: "기타", icon: CircleDot },
] as const;

export type LocationAmenityIconKey = (typeof LOCATION_AMENITY_ICON_OPTIONS)[number]["key"];

export type LocationAmenity = {
  label: string;
  description: string;
  iconKey: LocationAmenityIconKey;
};

export const DEFAULT_LOCATION_AMENITY_ICON_KEY: LocationAmenityIconKey = "circle-dot";

export const LOCATION_AMENITY_ICON_KEYS = LOCATION_AMENITY_ICON_OPTIONS.map((option) => option.key);

export function isLocationAmenityIconKey(value: string): value is LocationAmenityIconKey {
  return LOCATION_AMENITY_ICON_KEYS.includes(value as LocationAmenityIconKey);
}

export function getLocationAmenityIcon(iconKey: string): LucideIcon {
  return LOCATION_AMENITY_ICON_OPTIONS.find((option) => option.key === iconKey)?.icon ?? CircleDot;
}
