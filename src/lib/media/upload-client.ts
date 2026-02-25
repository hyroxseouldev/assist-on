"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MediaBucket, UploadedMedia } from "@/lib/media/types";

type UploadOptions = {
  bucket: MediaBucket;
  userId: string;
  domainFolder: string;
  maxDimension: number;
  quality?: number;
};

type OptimizedImage = {
  file: File;
  width: number | null;
  height: number | null;
};

function createPath({ userId, domainFolder }: { userId: string; domainFolder: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomId = crypto.randomUUID();
  const timestamp = Date.now();
  return `users/${userId}/${domainFolder}/${year}/${month}/${timestamp}-${randomId}.webp`;
}

async function loadImage(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      img.src = imageUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function optimizeImage(file: File, maxDimension: number, quality: number): Promise<OptimizedImage> {
  const image = await loadImage(file);
  const originalWidth = image.width;
  const originalHeight = image.height;
  const maxSide = Math.max(originalWidth, originalHeight);

  const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 최적화에 실패했습니다.");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });

  if (!blob) {
    throw new Error("이미지 변환에 실패했습니다.");
  }

  const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
  return {
    file: new File([blob], fileName, { type: "image/webp" }),
    width,
    height,
  };
}

function validateFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }
}

export async function uploadImageToStorage(file: File, options: UploadOptions): Promise<UploadedMedia> {
  validateFile(file);

  const quality = options.quality ?? 0.8;
  const optimized = await optimizeImage(file, options.maxDimension, quality);
  const path = createPath({ userId: options.userId, domainFolder: options.domainFolder });

  const supabase = createSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage.from(options.bucket).upload(path, optimized.file, {
    upsert: false,
    contentType: optimized.file.type,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(path);

  return {
    bucket: options.bucket,
    path,
    publicUrl: data.publicUrl,
    mimeType: optimized.file.type,
    sizeBytes: optimized.file.size,
    width: optimized.width,
    height: optimized.height,
  };
}
