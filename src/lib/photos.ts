import { Platform } from 'react-native';

export const MAX_VEHICLE_PHOTOS = 6;
export const MAX_SERVICE_PHOTOS = 5;
export const VEHICLE_PHOTO_DIR = 'vehicle-photos';
export const SERVICE_PHOTO_DIR = 'service-photos';

/** En web, se reduce el lado más largo a este tamaño para no llenar localStorage. */
export const WEB_PHOTO_MAX_EDGE = 1280;
export const WEB_PHOTO_JPEG_QUALITY = 0.7;

export type PhotoKind = 'vehicle' | 'service';

const PHOTO_DIRS: Record<PhotoKind, string> = {
  vehicle: VEHICLE_PHOTO_DIR,
  service: SERVICE_PHOTO_DIR,
};

export function photoDir(kind: PhotoKind): string {
  return PHOTO_DIRS[kind];
}

export function extensionFromUri(uri: string, mimeType?: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic';
  const path = uri.split('?')[0] ?? uri;
  const match = /\.([a-zA-Z0-9]+)$/.exec(path);
  if (match) return match[1].toLowerCase();
  return 'jpg';
}

export function isAppStoredPhoto(uri: string, kind: PhotoKind = 'vehicle'): boolean {
  return uri.includes(`/${photoDir(kind)}/`);
}

export function limitPhotos(uris: string[] | undefined, max: number): string[] {
  return (uris ?? []).slice(0, max);
}

/** Devuelve la lista recortada al máximo, o undefined si quedó vacía (registros sin fotos). */
export function optionalPhotoUris(uris: string[] | undefined, max: number): string[] | undefined {
  const limited = limitPhotos(uris, max);
  return limited.length > 0 ? limited : undefined;
}

function uniqueName(mimeType?: string, uri = ''): string {
  const ext = extensionFromUri(uri, mimeType);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `photo-${stamp}.${ext}`;
}

async function downscaleDataUriIfNeeded(dataUri: string): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return dataUri;
  }
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = dataUri;
    });
    const maxEdge = Math.max(image.width, image.height);
    if (!maxEdge || maxEdge <= WEB_PHOTO_MAX_EDGE) {
      return dataUri;
    }
    const scale = WEB_PHOTO_MAX_EDGE / maxEdge;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUri;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', WEB_PHOTO_JPEG_QUALITY);
  } catch {
    return dataUri;
  }
}

/**
 * Copia la imagen al directorio de documentos de la app (nativo) para que
 * no se pierda si el sistema limpia la caché. En web deja la URI tal cual
 * (blob: o data:), y si es grande la reduce para no llenar localStorage.
 */
async function webUriToDataUri(uri: string): Promise<string> {
  let dataUri = uri;
  if (!uri.startsWith('data:')) {
    if (typeof fetch !== 'function') return uri;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      if (typeof FileReader === 'undefined') return uri;
      dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || uri));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return uri;
    }
  }
  return downscaleDataUriIfNeeded(dataUri);
}

export async function persistPhoto(
  uri: string,
  mimeType?: string,
  kind: PhotoKind = 'vehicle',
): Promise<string> {
  if (Platform.OS === 'web') {
    return webUriToDataUri(uri);
  }

  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, photoDir(kind));
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  const dest = new File(dir, uniqueName(mimeType, uri));
  const source = new File(uri);
  await source.copy(dest);
  return dest.uri;
}

export async function persistVehiclePhoto(uri: string, mimeType?: string): Promise<string> {
  return persistPhoto(uri, mimeType, 'vehicle');
}

export async function persistServicePhoto(uri: string, mimeType?: string): Promise<string> {
  return persistPhoto(uri, mimeType, 'service');
}

/** Borra el archivo solo si lo guardamos nosotros en el directorio de esa clase. */
export async function deletePhoto(uri: string, kind: PhotoKind = 'vehicle'): Promise<void> {
  if (Platform.OS === 'web' || !isAppStoredPhoto(uri, kind)) {
    return;
  }

  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Si el archivo ya no está, no interrumpimos el flujo.
  }
}

export async function deleteVehiclePhoto(uri: string): Promise<void> {
  return deletePhoto(uri, 'vehicle');
}

export async function deleteServicePhoto(uri: string): Promise<void> {
  return deletePhoto(uri, 'service');
}

export async function deleteRemovedPhotos(
  previous: string[] | undefined,
  next: string[] | undefined,
  kind: PhotoKind = 'vehicle',
): Promise<void> {
  const keep = new Set(next ?? []);
  await Promise.all((previous ?? []).filter((uri) => !keep.has(uri)).map((uri) => deletePhoto(uri, kind)));
}
