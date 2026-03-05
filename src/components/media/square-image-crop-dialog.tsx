"use client";

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
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function loadImageElement(src: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

function getOffsetLimit(imageWidth: number, imageHeight: number, scale: number) {
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  return {
    x: Math.max(0, (scaledWidth - CROP_SIZE) / 2),
    y: Math.max(0, (scaledHeight - CROP_SIZE) / 2),
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
}) {
  const outputSize = 1024;
  const image = await loadImageElement(args.objectUrl);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 크롭에 실패했습니다.");
  }

  const sourceX = args.imageWidth / 2 + (-CROP_SIZE / 2 - args.offsetX) / args.scale;
  const sourceY = args.imageHeight / 2 + (-CROP_SIZE / 2 - args.offsetY) / args.scale;
  const sourceSize = CROP_SIZE / args.scale;

  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.9);
  });

  if (!blob) {
    throw new Error("크롭 이미지 생성에 실패했습니다.");
  }

  const baseName = args.sourceFileName.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}-square.webp`, { type: "image/webp" });
}

export function SquareImageCropDialog({ open, file, isSubmitting, onOpenChange, onConfirm }: SquareImageCropDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [open, file]);

  useEffect(() => {
    if (!objectUrl) {
      setNaturalWidth(0);
      setNaturalHeight(0);
      return;
    }

    let cancelled = false;
    setIsPreparing(true);
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);

    void loadImageElement(objectUrl)
      .then((image) => {
        if (cancelled) return;
        setNaturalWidth(image.width);
        setNaturalHeight(image.height);
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreparing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [objectUrl]);

  const baseScale = useMemo(() => {
    if (!naturalWidth || !naturalHeight) {
      return 1;
    }
    return Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
  }, [naturalWidth, naturalHeight]);

  const scale = baseScale * zoom;

  const clampOffset = (x: number, y: number) => {
    if (!naturalWidth || !naturalHeight) {
      return { x: 0, y: 0 };
    }
    const limit = getOffsetLimit(naturalWidth, naturalHeight, scale);
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
    setOffsetX(next.x);
    setOffsetY(next.y);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    pointerStartRef.current = null;
    setIsDragging(false);
  };

  const handleZoomChange = (value: number[]) => {
    const nextZoom = value[0] ?? 1;
    setZoom(nextZoom);
    const nextScale = baseScale * nextZoom;
    const limit = getOffsetLimit(naturalWidth, naturalHeight, nextScale);
    setOffsetX((prev) => clamp(prev, -limit.x, limit.x));
    setOffsetY((prev) => clamp(prev, -limit.y, limit.y));
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
    });

    await onConfirm(croppedFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>썸네일 1:1 크롭</DialogTitle>
          <DialogDescription>드래그와 확대/축소로 정사각 썸네일 영역을 맞춰 주세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className="relative mx-auto size-80 overflow-hidden rounded-md border border-zinc-200 bg-zinc-900/90"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {objectUrl ? (
              <img
                src={objectUrl}
                alt="크롭 원본"
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
            <div className="pointer-events-none absolute inset-0 border border-white/80" />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-zinc-600">확대</p>
            <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={handleZoomChange} />
          </div>

          <p className="text-xs text-zinc-500">출력은 1:1 비율(1024x1024 webp)로 저장됩니다.</p>
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
