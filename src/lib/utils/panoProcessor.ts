import JSZip from "jszip";
import type { TourScene, TourLevel } from "../types";
import { registerTileBlobs } from "./tileRegistry";
import { httpClient } from "../httpClient";

export const TILE_SIZE = 512;
export const MIN_FACE_SIZE = 512;
const DEFAULT_CONCURRENCY = 6;

export type CubeFace = "f" | "b" | "l" | "r" | "u" | "d";
export const CUBE_FACES: CubeFace[] = ["f", "b", "l", "r", "u", "d"];

export interface ProcessProgress {
  fileName: string;
  currentStep: string;
  processedTiles: number;
  totalTiles: number;
  percent: number;
}

export interface ProcessPanoramaResult {
  scene: TourScene;
  dataJson: any;
  tilesZip: JSZip;
  blobUrls: Record<string, string>;
}

/**
 * Loads an image File into an HTMLImageElement.
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to read image file "${file.name}".`));
    };
    img.src = url;
  });
}

/**
 * Calculates cube face sizes (halving from maxFaceSize down to 512).
 */
export function buildCubeLevels(maxFaceSize: number, minSize = MIN_FACE_SIZE): number[] {
  const levels: number[] = [];
  let current = maxFaceSize;
  while (current >= minSize) {
    levels.push(current);
    current = Math.floor(current / 2);
  }
  return levels.reverse();
}

/**
 * Helper for running async tasks with bounded concurrency.
 */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const exec = async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  };
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    exec
  );
  await Promise.all(workers);
  return results;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      type,
      quality
    );
  });
}

/**
 * Projects an equirectangular image canvas to 6 cubemap face canvases.
 */
export function equirectangularToCubemap(
  sourceCanvas: HTMLCanvasElement,
  faceSize: number,
  onFaceProgress?: (faceName: string, faceIdx: number) => void
): Record<CubeFace, HTMLCanvasElement> {
  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Could not get 2d context for source image");

  const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
  const srcPixels = srcData.data;

  const result: Record<string, HTMLCanvasElement> = {};

  for (let fIdx = 0; fIdx < CUBE_FACES.length; fIdx++) {
    const face = CUBE_FACES[fIdx];
    onFaceProgress?.(face, fIdx);

    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = faceSize;
    faceCanvas.height = faceSize;
    const faceCtx = faceCanvas.getContext("2d")!;
    const faceImageData = faceCtx.createImageData(faceSize, faceSize);
    const facePixels = faceImageData.data;

    for (let y = 0; y < faceSize; y++) {
      const ny = (2 * (y + 0.5)) / faceSize - 1;

      for (let x = 0; x < faceSize; x++) {
        const nx = (2 * (x + 0.5)) / faceSize - 1;

        let X = 0, Y = 0, Z = 0;

        switch (face) {
          case "f": X = nx;  Y = -ny; Z = 1;   break;
          case "b": X = -nx; Y = -ny; Z = -1;  break;
          case "l": X = -1;  Y = -ny; Z = nx;  break;
          case "r": X = 1;   Y = -ny; Z = -nx; break;
          case "u": X = nx;  Y = 1;   Z = ny;  break;
          case "d": X = nx;  Y = -1;  Z = -ny; break;
        }

        const r = Math.sqrt(X * X + Y * Y + Z * Z);
        const theta = Math.atan2(X, Z);
        const phi = Math.asin(Y / r);

        const u = ((theta + Math.PI) / (2 * Math.PI)) * srcWidth;
        const v = ((Math.PI / 2 - phi) / Math.PI) * srcHeight;

        const u0 = Math.floor(u);
        const u1 = (u0 + 1) % srcWidth;
        const v0 = Math.max(0, Math.min(srcHeight - 1, Math.floor(v)));
        const v1 = Math.max(0, Math.min(srcHeight - 1, v0 + 1));

        const du = u - u0;
        const dv = v - v0;

        const idx00 = (v0 * srcWidth + u0) * 4;
        const idx10 = (v0 * srcWidth + u1) * 4;
        const idx01 = (v1 * srcWidth + u0) * 4;
        const idx11 = (v1 * srcWidth + u1) * 4;

        const outIdx = (y * faceSize + x) * 4;

        for (let c = 0; c < 4; c++) {
          const val =
            (1 - du) * (1 - dv) * srcPixels[idx00 + c] +
            du * (1 - dv) * srcPixels[idx10 + c] +
            (1 - du) * dv * srcPixels[idx01 + c] +
            du * dv * srcPixels[idx11 + c];
          facePixels[outIdx + c] = Math.round(val);
        }
      }
    }

    faceCtx.putImageData(faceImageData, 0, 0);
    result[face] = faceCanvas;
  }

  return result as Record<CubeFace, HTMLCanvasElement>;
}

interface TileTask {
  levelIndex: number;
  face: CubeFace;
  levelSize: number;
  x: number;
  y: number;
  tileWidth: number;
  tileHeight: number;
  subPath: string; // e.g. "0/f/0/0.jpg"
}

/**
 * Process a 2:1 Equirectangular panorama file into Marzipano Cubemap tiles and JSON metadata.
 */
export async function processPanoramaFile(
  file: File,
  options?: {
    existingSceneId?: string;
    existingSceneName?: string;
    onProgress?: (progress: ProcessProgress) => void;
  }
): Promise<ProcessPanoramaResult> {
  const onProgress = options?.onProgress;
  onProgress?.({
    fileName: file.name,
    currentStep: "Loading image...",
    processedTiles: 0,
    totalTiles: 0,
    percent: 0,
  });

  // 1. Load image & validate 2:1 aspect ratio
  const img = await loadImage(file);
  const originalWidth = img.width;
  const originalHeight = img.height;

  const aspectRatio = originalWidth / originalHeight;
  if (aspectRatio < 1.7 || aspectRatio > 2.3) {
    throw new Error(
      `Invalid image "${file.name}". Panorama requires a 2:1 aspect ratio (width must be twice the height). Current dimensions: ${originalWidth}x${originalHeight} (ratio: ${aspectRatio.toFixed(2)}:1)`
    );
  }

  // Determine sceneId & sceneName
  const rawId = options?.existingSceneId
    ? options.existingSceneId
    : file.name
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_");

  const sceneId = rawId || `scene_${Date.now()}`;
  const sceneName =
    options?.existingSceneName ||
    file.name.replace(/\.[^/.]+$/, "") ||
    sceneId;

  // 2. Compute max face size (e.g. originalWidth / 4)
  const calculatedFaceSize = Math.max(512, Math.round(originalWidth / 4));
  // Round to nearest power of 2 (e.g. 512, 1024, 2048, 4096)
  const maxFaceSize = Math.max(
    512,
    Math.pow(2, Math.round(Math.log2(calculatedFaceSize)))
  );

  onProgress?.({
    fileName: file.name,
    currentStep: `Projecting Equirectangular to 6 Cube Faces (${maxFaceSize}x${maxFaceSize})...`,
    processedTiles: 0,
    totalTiles: 0,
    percent: 5,
  });

  // Draw source image to canvas
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = originalWidth;
  srcCanvas.height = originalHeight;
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx?.drawImage(img, 0, 0);

  // Project Equirectangular to 6 Cube Faces
  const masterFaces = equirectangularToCubemap(srcCanvas, maxFaceSize, (faceName, fIdx) => {
    onProgress?.({
      fileName: file.name,
      currentStep: `Projecting Cube Face "${faceName.toUpperCase()}" (${fIdx + 1}/6)...`,
      processedTiles: 0,
      totalTiles: 0,
      percent: 5 + Math.round(((fIdx + 1) / 6) * 20),
    });
  });

  // 3. Build cube level sizes (e.g. [512, 1024, 2048])
  const levelSizes = buildCubeLevels(maxFaceSize);
  const tourLevels: TourLevel[] = [];
  const levelsMeta: any[] = [];

  for (let z = 0; z < levelSizes.length; z++) {
    const size = levelSizes[z];
    const isFallback = z === 0 && levelSizes.length > 1;

    tourLevels.push({
      tileSize: TILE_SIZE,
      size,
      ...(isFallback ? { fallbackOnly: true } : {}),
    });

    levelsMeta.push({
      level: z,
      size,
      tileSize: TILE_SIZE,
      fallbackOnly: isFallback,
    });
  }

  // 4. Build tile tasks for all levels x 6 faces x cols x rows
  const tasks: TileTask[] = [];

  // Cache face canvases resized per level
  const resizedFacesMap: Record<number, Record<CubeFace, HTMLCanvasElement>> = {};

  for (let z = 0; z < levelSizes.length; z++) {
    const levelSize = levelSizes[z];
    resizedFacesMap[z] = {} as Record<CubeFace, HTMLCanvasElement>;

    for (const face of CUBE_FACES) {
      const masterCanvas = masterFaces[face];
      let levelCanvas: HTMLCanvasElement;

      if (levelSize === maxFaceSize) {
        levelCanvas = masterCanvas;
      } else {
        levelCanvas = document.createElement("canvas");
        levelCanvas.width = levelSize;
        levelCanvas.height = levelSize;
        const lCtx = levelCanvas.getContext("2d")!;
        lCtx.imageSmoothingEnabled = true;
        lCtx.imageSmoothingQuality = "high";
        lCtx.drawImage(masterCanvas, 0, 0, levelSize, levelSize);
      }

      resizedFacesMap[z][face] = levelCanvas;

      const cols = Math.ceil(levelSize / TILE_SIZE);
      const rows = Math.ceil(levelSize / TILE_SIZE);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tileWidth = Math.min(TILE_SIZE, levelSize - x * TILE_SIZE);
          const tileHeight = Math.min(TILE_SIZE, levelSize - y * TILE_SIZE);

          tasks.push({
            levelIndex: z,
            face,
            levelSize,
            x,
            y,
            tileWidth,
            tileHeight,
            subPath: `${z}/${face}/${y}/${x}.jpg`,
          });
        }
      }
    }
  }

  const totalTiles = tasks.length;
  let processedCount = 0;

  onProgress?.({
    fileName: file.name,
    currentStep: `Slicing Marzipano cubemap tiles (${totalTiles} tiles)...`,
    processedTiles: 0,
    totalTiles,
    percent: 25,
  });

  const tilesZip = new JSZip();
  const blobUrls: Record<string, string> = {};

  const tileCanvas = document.createElement("canvas");
  const tileCtx = tileCanvas.getContext("2d");

  // 5. Slice tiles in parallel batches using mapConcurrent
  await mapConcurrent(tasks, DEFAULT_CONCURRENCY, async (task) => {
    const faceCanvas = resizedFacesMap[task.levelIndex][task.face];
    tileCanvas.width = task.tileWidth;
    tileCanvas.height = task.tileHeight;

    if (tileCtx && faceCanvas) {
      tileCtx.clearRect(0, 0, task.tileWidth, task.tileHeight);
      tileCtx.drawImage(
        faceCanvas,
        task.x * TILE_SIZE,
        task.y * TILE_SIZE,
        task.tileWidth,
        task.tileHeight,
        0,
        0,
        task.tileWidth,
        task.tileHeight
      );
    }

    const blob = await canvasToBlob(tileCanvas, "image/jpeg", 0.85);
    const arrayBuffer = await blob.arrayBuffer();

    // Store in ZIP under `tiles/${sceneId}/${subPath}`
    tilesZip.file(`tiles/${sceneId}/${task.subPath}`, arrayBuffer);

    // Register local Blob URL for live preview
    const blobUrl = URL.createObjectURL(blob);
    blobUrls[task.subPath] = blobUrl;

    processedCount++;
    const percent = Math.round((processedCount / totalTiles) * 70) + 25;
    onProgress?.({
      fileName: file.name,
      currentStep: `Slicing Marzipano tiles (${processedCount}/${totalTiles})...`,
      processedTiles: processedCount,
      totalTiles,
      percent,
    });
  });

  // Generate preview thumbnail (512x256)
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = 512;
  previewCanvas.height = 256;
  const pCtx = previewCanvas.getContext("2d");
  if (pCtx) {
    pCtx.drawImage(img, 0, 0, 512, 256);
    const previewBlob = await canvasToBlob(previewCanvas, "image/jpeg", 0.7);
    const previewBuf = await previewBlob.arrayBuffer();
    tilesZip.file(`tiles/${sceneId}/preview.jpg`, previewBuf);

    const previewBlobUrl = URL.createObjectURL(previewBlob);
    blobUrls["preview.jpg"] = previewBlobUrl;
  }

  // 6. Build exported data.json according to Marzipano schema
  const dataJson = {
    id: sceneId,
    name: sceneName,
    faceSize: maxFaceSize,
    tileSize: TILE_SIZE,
    initialViewParameters: {
      yaw: 0,
      pitch: 0,
      fov: 1.5707963267948966,
    },
    linkHotspots: [],
    infoHotspots: [],
    levels: tourLevels,
  };

  const dataJsonString = JSON.stringify(dataJson, null, 2);
  tilesZip.file(`tiles/${sceneId}/data.json`, dataJsonString);
  tilesZip.file(`data.json`, dataJsonString);

  // Register blob URLs in central tile registry
  registerTileBlobs(sceneId, blobUrls);

  // 7. Create TourScene domain object
  const scene: TourScene = {
    id: sceneId,
    name: sceneName,
    levels: tourLevels,
    faceSize: maxFaceSize,
    initialViewParameters: {
      yaw: 0,
      pitch: 0,
      fov: 1.5707963267948966,
    },
    linkHotspots: [],
    infoHotspots: [],
  };

  onProgress?.({
    fileName: file.name,
    currentStep: "Completed!",
    processedTiles: totalTiles,
    totalTiles,
    percent: 100,
  });

  return {
    scene,
    dataJson,
    tilesZip,
    blobUrls,
  };
}

/**
 * Uploads all tiles from a JSZip instance to backend API PUT /api/tiles/:folderName
 */
export async function uploadTileFolder(
  folderName: string,
  tilesZip: JSZip,
  token?: string | null,
): Promise<void> {
  const files: { path: string; content: string; encoding: string }[] = [];

  for (const [relativePath, zipEntry] of Object.entries(tilesZip.files)) {
    if (zipEntry.dir) continue;
    let cleanPath = relativePath.replace(/\\/g, "/");
    const scenePrefixRegex = new RegExp(`^tiles\\/${folderName}\\/`, "i");
    if (scenePrefixRegex.test(cleanPath)) {
      cleanPath = cleanPath.replace(scenePrefixRegex, "");
    } else {
      cleanPath = cleanPath.replace(/^tiles\//i, "");
    }
    if (!cleanPath || cleanPath.endsWith("data.json")) continue;

    const base64Content = await zipEntry.async("base64");
    files.push({
      path: cleanPath,
      content: base64Content,
      encoding: "base64",
    });
  }

  if (files.length === 0) return;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  await httpClient.put(`/tiles/${encodeURIComponent(folderName)}`, {
    headers,
    body: { files },
    timeout: 60000,
  });
}

