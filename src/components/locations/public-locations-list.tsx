import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { getLocationAmenityIcon } from "@/lib/locations/icons";
import type { PublicLocationSummary } from "@/lib/locations/server";

type PublicLocationsListProps = {
  tenantSlug: string;
  locations: PublicLocationSummary[];
};

export function PublicLocationsList({ tenantSlug, locations }: PublicLocationsListProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <section className="space-y-4">
        <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Locations
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">지점 안내</h1>
          <p className="text-sm leading-7 text-zinc-600 sm:text-base">
            이용 가능한 매장과 지점의 시설, 위치, 공간 정보를 확인하세요.
          </p>
        </div>
      </section>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-14 text-center text-sm text-zinc-500">
          현재 공개된 지점이 없습니다.
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2">
          {locations.map((location) => {
            const href = `/t/${tenantSlug}/locations/${location.id}`;
            const previewAmenities = location.amenities.slice(0, 3);

            return (
              <Link
                key={location.id}
                href={href}
                className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm shadow-zinc-900/5 transition-all duration-200 hover:-translate-y-1"
              >
                <div className="relative aspect-[16/10] bg-zinc-100">
                  <Image
                    src={location.imageUrls[0] || location.mapImageUrl || "/logo.png"}
                    alt={`${location.name} 이미지`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{location.name}</h2>
                    <p className="flex items-start gap-2 text-sm leading-6 text-zinc-600">
                      <MapPin className="mt-1 size-4 shrink-0" />
                      <span>{location.address}</span>
                    </p>
                    {location.description ? <p className="line-clamp-2 text-sm leading-6 text-zinc-600">{location.description}</p> : null}
                  </div>

                  {previewAmenities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {previewAmenities.map((amenity) => {
                        const Icon = getLocationAmenityIcon(amenity.iconKey);
                        return (
                          <span
                            key={`${location.id}-${amenity.label}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
                          >
                            <Icon className="size-3.5" />
                            {amenity.label}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="flex items-center text-sm font-semibold text-zinc-950">
                    자세히 보기
                    <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
