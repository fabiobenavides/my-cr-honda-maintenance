import { Platform } from 'react-native';

export const MAX_VEHICLE_PHOTOS = 6;
export const VEHICLE_PHOTO_DIR = 'vehicle-photos';

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

export function isAppStoredPhoto(uri: string): boolean {
  return uri.includes(`/${VEHICLE_PHOTO_DIR}/`);
}

function uniqueName(mimeType?: string, uri = ''): string {
  const ext = extensionFromUri(uri, mimeType);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `photo-${stamp}.${ext}`;
}

/**
 * Copia la imagen al directorio de documentos de la app (nativo) para que
 * no se pierda si el sistema limpia la caché. En web deja la URI tal cual
 * (blob: o data:).
 */
async function webUriToDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  if (typeof fetch !== 'function') return uri;
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (typeof FileReader === 'undefined') return uri;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || uri));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return uri;
  }
}

export async function persistVehiclePhoto(uri: string, mimeType?: string): Promise<string> {
  if (Platform.OS === 'web') {
    return webUriToDataUri(uri);
  }

  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, VEHICLE_PHOTO_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  const dest = new File(dir, uniqueName(mimeType, uri));
  const source = new File(uri);
  await source.copy(dest);
  return dest.uri;
}

/** Borra el archivo solo si lo guardamos nosotros en el directorio de la app. */
export async function deleteVehiclePhoto(uri: string): Promise<void> {
  if (Platform.OS === 'web' || !isAppStoredPhoto(uri)) {
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

export async function deleteRemovedPhotos(
  previous: string[] | undefined,
  next: string[] | undefined,
): Promise<void> {
  const keep = new Set(next ?? []);
  await Promise.all((previous ?? []).filter((uri) => !keep.has(uri)).map((uri) => deleteVehiclePhoto(uri)));
}
