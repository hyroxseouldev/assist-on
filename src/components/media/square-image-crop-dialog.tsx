"use client";

import Image from "next/image";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const CROP_SIZE = 320;

type SquareImageCropDialogProps = {
  open: boolean;
  file: File | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (croppedFile: File) => Promise<void> | void;
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
  title?: string;
  description?: string;
  outputLabel?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function loadImageElement(src: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

function getOffsetLimit(imageWidth: number, imageHeight: number, scale: number, frameWidth: number, frameHeight: number) {
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  return {
    x: Math.max(0, (scaledWidth - frameWidth) / 2),
    y: Math.max(0, (scaledHeight - frameHeight) / 2),
  };
}

function getCropFrameSize(aspectRatio: number) {
  if (aspectRatio >= 1) {
    return {
      width: CROP_SIZE,
      height: Math.round(CROP_SIZE / aspectRatio),
    };
  }

  return {
    width: Math.round(CROP_SIZE * aspectRatio),
    height: CROP_SIZE,
  };
}

async function createSquareCroppedFile(args: {
  objectUrl: string;
  sourceFileName: string;
  imageWidth: number;
  imageHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
}) {
  const cropFrame = getCropFrameSize(args.aspectRatio);
  const image = await loadImageElement(args.objectUrl);
  const canvas = document.createElement("canvas");
  canvas.width = args.outputWidth;
  canvas.height = args.outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 크롭에 실패했습니다.");
  }

  const sourceX = args.imageWidth / 2 + (-cropFrame.width / 2 - args.offsetX) / args.scale;
  const sourceY = args.imageHeight / 2 + (-cropFrame.height / 2 - args.offsetY) / args.scale;
  const sourceWidth = cropFrame.width / args.scale;
  const sourceHeight = cropFrame.height / args.scale;

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, args.outputWidth, args.outputHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.9);
  });

  if (!blob) {
    throw new Error("크롭 이미지 생성에 실패했습니다.");
  }

  const baseName = args.sourceFileName.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}-cropped.webp`, { type: "image/webp" });
}

export function SquareImageCropDialog({
  open,
  file,
  isSubmitting,
  onOpenChange,
  onConfirm,
  aspectRatio = 1,
  outputWidth = 1024,
  outputHeight = 1024,
  title = "썸네일 1:1 크롭",
  description = "드래그와 확대/축소로 정사각 썸네일 영역을 맞춰 주세요.",
  outputLabel = "출력은 1:1 비율(1024x1024 webp)로 저장됩니다.",
}: SquareImageCropDialogProps) {
  const [loadedImage, setLoadedImage] = useState<{ src: string; width: number; height: number } | null>(null);
  const [cropState, setCropState] = useState<{ src: string | null; zoom: number; offsetX: number; offsetY: number }>({
    src: null,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const objectUrl = useMemo(() => {
    if (!open || !file) {
      return null;
    }
    return URL.createObjectURL(file);
  }, [file, open]);

  useEffect(() => {
    if (!objectUrl) {
      return;
    }

    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  useEffect(() => {
    if (!objectUrl) {
      return;
    }

    let cancelled = false;

    void loadImageElement(objectUrl)
      .then((image) => {
        if (cancelled) return;
        setLoadedImage({ src: objectUrl, width: image.width, height: image.height });
      });

    return () => {
      cancelled = true;
    };
  }, [objectUrl]);

  const naturalWidth = loadedImage?.src === objectUrl ? loadedImage.width : 0;
  const naturalHeight = loadedImage?.src === objectUrl ? loadedImage.height : 0;
  const isPreparing = Boolean(objectUrl) && (!naturalWidth || !naturalHeight);
  const zoom = cropState.src === objectUrl ? cropState.zoom : 1;
  const offsetX = cropState.src === objectUrl ? cropState.offsetX : 0;
  const offsetY = cropState.src === objectUrl ? cropState.offsetY : 0;

  const cropFrame = useMemo(() => getCropFrameSize(aspectRatio), [aspectRatio]);

  const baseScale = useMemo(() => {
    if (!naturalWidth || !naturalHeight) {
      return 1;
    }
    return Math.max(cropFrame.width / naturalWidth, cropFrame.height / naturalHeight);
  }, [cropFrame.height, cropFrame.width, naturalHeight, naturalWidth]);

  const scale = baseScale * zoom;

  const clampOffset = (x: number, y: number) => {
    if (!naturalWidth || !naturalHeight) {
      return { x: 0, y: 0 };
    }
    const limit = getOffsetLimit(naturalWidth, naturalHeight, scale, cropFrame.width, cropFrame.height);
    return {
      x: clamp(x, -limit.x, limit.x),
      y: clamp(y, -limit.y, limit.y),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offsetX,
      oy: offsetY,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) {
      return;
    }

    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    const next = clampOffset(pointerStartRef.current.ox + deltaX, pointerStartRef.current.oy + deltaY);
    setCropState({ src: objectUrl, zoom, offsetX: next.x, offsetY: next.y });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    pointerStartRef.current = null;
    setIsDragging(false);
  };

  const handleZoomChange = (value: number[]) => {
    const nextZoom = value[0] ?? 1;
    const nextScale = baseScale * nextZoom;
    const limit = getOffsetLimit(naturalWidth, naturalHeight, nextScale, cropFrame.width, cropFrame.height);
    setCropState({
      src: objectUrl,
      zoom: nextZoom,
      offsetX: clamp(offsetX, -limit.x, limit.x),
      offsetY: clamp(offsetY, -limit.y, limit.y),
    });
  };

  const handleConfirm = async () => {
    if (!file || !objectUrl || !naturalWidth || !naturalHeight) {
      return;
    }

    const croppedFile = await createSquareCroppedFile({
      objectUrl,
      sourceFileName: file.name,
      imageWidth: naturalWidth,
      imageHeight: naturalHeight,
      offsetX,
      offsetY,
      scale,
      aspectRatio,
      outputWidth,
      outputHeight,
    });

    await onConfirm(croppedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className="relative mx-auto size-80 overflow-hidden rounded-md border border-zinc-200 bg-zinc-900/90"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {objectUrl ? (
              <Image
                src={objectUrl}
                alt="크롭 원본"
                unoptimized
                width={naturalWidth || 1}
                height={naturalHeight || 1}
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  width: naturalWidth || undefined,
                  height: naturalHeight || undefined,
                  transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                  transformOrigin: "center center",
                }}
              />
            ) : null}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 border border-white/80"
              style={{
                width: cropFrame.width,
                height: cropFrame.height,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-600">확대</p>
            <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={handleZoomChange} />
          </div>

          <p className="text-xs text-zinc-500">{outputLabel}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={isSubmitting || isPreparing || !objectUrl}>
            {isSubmitting ? "적용 중..." : isDragging ? "위치 조정 중..." : "크롭 적용"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
