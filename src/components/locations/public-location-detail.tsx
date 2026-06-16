import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLocationAmenityIcon } from "@/lib/locations/icons";
import type { PublicLocationSummary } from "@/lib/locations/server";

type PublicLocationDetailProps = {
  tenantSlug: string;
  location: PublicLocationSummary;
};

export function PublicLocationDetail({ tenantSlug, location }: PublicLocationDetailProps) {
  const heroImage = location.imageUrls[0] || location.mapImageUrl || "/logo.png";
  const galleryImages = location.imageUrls.slice(1);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <div>
        <Button asChild variant="ghost" className="px-0 text-zinc-600 hover:bg-transparent hover:text-zinc-950">
          <Link href={`/t/${tenantSlug}/locations`}>
            <ArrowLeft className="size-4" />
            지점 목록
          </Link>
        </Button>
      </div>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-4">
          <div className="relative aspect-[16/11] overflow-hidden rounded-lg bg-zinc-100">
            <Image src={heroImage} alt={`${location.name} 대표 이미지`} fill className="object-cover" sizes="(min-width: 1024px) 58vw, 100vw" priority />
          </div>
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {galleryImages.map((url, index) => (
                <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                  <Image src={url} alt={`${location.name} 갤러리 ${index + 2}`} fill className="object-cover" sizes="160px" />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Location
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">{location.name}</h1>
              <p className="flex items-start gap-2 text-sm leading-6 text-zinc-600 sm:text-base">
                <MapPin className="mt-1 size-4 shrink-0" />
                <span>{location.address}</span>
              </p>
              {location.description ? <p className="whitespace-pre-line text-sm leading-7 text-zinc-700 sm:text-base">{location.description}</p> : null}
            </div>
          </div>

          {location.amenities.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-zinc-950">편의시설</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {location.amenities.map((amenity) => {
                  const Icon = getLocationAmenityIcon(amenity.iconKey);
                  return (
                    <div key={`${amenity.iconKey}-${amenity.label}`} className="rounded-lg border border-zinc-200 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-800">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-950">{amenity.label}</p>
                          {amenity.description ? <p className="mt-1 text-sm leading-6 text-zinc-600">{amenity.description}</p> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      {location.mapImageUrl ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-950">지도</h2>
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
            <Image src={location.mapImageUrl} alt={`${location.name} 지도 이미지`} fill className="object-cover" sizes="100vw" />
          </div>
        </section>
      ) : null}
    </main>
  );
}
