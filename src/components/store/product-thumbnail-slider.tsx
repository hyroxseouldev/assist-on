"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type ProductThumbnailSliderProps = {
  images: string[];
  title: string;
};

export function ProductThumbnailSlider({ images, title }: ProductThumbnailSliderProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isMultiple = images.length > 1;

  useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const normalizedImages = useMemo(() => {
    if (images.length > 0) {
      return images;
    }

    return ["/xon_logo.jpg"];
  }, [images]);

  return (
    <div className="space-y-3">
      <Carousel setApi={setApi} opts={{ loop: isMultiple }} className="w-full">
        <CarouselContent>
          {normalizedImages.map((src, index) => (
            <CarouselItem key={`${src}-${index}`}>
              <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 sm:h-80">
                <Image
                  src={src}
                  alt={`${title} 썸네일 ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {isMultiple ? (
          <>
            <CarouselPrevious className="left-3 border-zinc-200 bg-white/90" />
            <CarouselNext className="right-3 border-zinc-200 bg-white/90" />
          </>
        ) : null}
      </Carousel>

      {isMultiple ? (
        <div className="flex items-center justify-center gap-1.5">
          {normalizedImages.map((_, index) => (
            <span
              key={index}
              className={index === selectedIndex ? "h-1.5 w-5 rounded-full bg-zinc-900" : "h-1.5 w-1.5 rounded-full bg-zinc-300"}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
