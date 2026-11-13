import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import {
  MAX_SERVICE_PHOTOS,
  MAX_VEHICLE_PHOTOS,
  deletePhoto,
  deleteRemovedPhotos,
  deleteServicePhoto,
  deleteVehiclePhoto,
  extensionFromUri,
  isAppStoredPhoto,
  limitPhotos,
  optionalPhotoUris,
  persistServicePhoto,
  persistVehiclePhoto,
} from './photos';

const deleted: string[] = [];
const copied: Array<{ from: string; to: string }> = [];

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    exists = false;
    constructor(base: { uri?: string } | string, name?: string) {
      const root = typeof base === 'string' ? base : (base.uri ?? '');
      this.uri = name ? `${root.replace(/\/$/, '')}/${name}` : root;
    }
    create() {
      this.exists = true;
    }
  }

  class File {
    uri: string;
    exists = true;
    constructor(base: { uri?: string } | string, name?: string) {
      const root = typeof base === 'string' ? base : (base.uri ?? '');
      this.uri = name ? `${root.replace(/\/$/, '')}/${name}` : root;
    }
    async copy(dest: { uri: string }) {
      copied.push({ from: this.uri, to: dest.uri });
    }
    delete() {
      deleted.push(this.uri);
      this.exists = false;
    }
  }

  const Paths = { document: { uri: 'file:///documents' } };

  return { Directory, File, Paths };
});

function setPlatform(os: string) {
  (Platform as { OS: string }).OS = os;
}

describe('photos', () => {
  beforeEach(() => {
    deleted.length = 0;
    copied.length = 0;
    setPlatform('ios');
  });

  it('limita a 6 fotos del vehículo y 5 del servicio', () => {
    expect(MAX_VEHICLE_PHOTOS).toBe(6);
    expect(MAX_SERVICE_PHOTOS).toBe(5);
    expect(limitPhotos(['a', 'b', 'c', 'd', 'e', 'f', 'g'], MAX_SERVICE_PHOTOS)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
    expect(optionalPhotoUris([], MAX_SERVICE_PHOTOS)).toBeUndefined();
    expect(optionalPhotoUris(undefined, MAX_SERVICE_PHOTOS)).toBeUndefined();
    expect(optionalPhotoUris(['one'], MAX_SERVICE_PHOTOS)).toEqual(['one']);
  });

  it('deduce la extensión de la URI o del tipo MIME', () => {
    expect(extensionFromUri('file:///tmp/pic.PNG')).toBe('png');
    expect(extensionFromUri('blob:http://localhost/abc', 'image/webp')).toBe('webp');
    expect(extensionFromUri('file:///cache/photo')).toBe('jpg');
  });

  it('solo considera propias las fotos del directorio de esa clase', () => {
    expect(isAppStoredPhoto('file:///documents/vehicle-photos/photo-1.jpg')).toBe(true);
    expect(isAppStoredPhoto('file:///cache/ImagePicker/abc.jpg')).toBe(false);
    expect(isAppStoredPhoto('file:///documents/service-photos/photo-1.jpg')).toBe(false);
    expect(isAppStoredPhoto('file:///documents/service-photos/photo-1.jpg', 'service')).toBe(true);
    expect(isAppStoredPhoto('file:///documents/vehicle-photos/photo-1.jpg', 'service')).toBe(false);
  });

  it('en nativo copia la foto del vehículo al directorio de documentos', async () => {
    const dest = await persistVehiclePhoto('file:///cache/picker/abc.png', 'image/png');
    expect(dest).toMatch(/^file:\/\/\/documents\/vehicle-photos\/photo-\d+-[a-z0-9]+\.png$/);
    expect(copied).toEqual([{ from: 'file:///cache/picker/abc.png', to: dest }]);
  });

  it('en nativo copia la foto del servicio a una carpeta distinta', async () => {
    const dest = await persistServicePhoto('file:///cache/picker/factura.jpg', 'image/jpeg');
    expect(dest).toMatch(/^file:\/\/\/documents\/service-photos\/photo-\d+-[a-z0-9]+\.jpg$/);
    expect(copied).toEqual([{ from: 'file:///cache/picker/factura.jpg', to: dest }]);
  });

  it('en web deja una data URI tal cual', async () => {
    setPlatform('web');
    const uri = 'data:image/png;base64,AAA';
    await expect(persistVehiclePhoto(uri)).resolves.toBe(uri);
    expect(copied).toEqual([]);
  });

  it('en web convierte un blob: a data URI para que sobreviva una recarga', async () => {
    setPlatform('web');
    const blobUri = 'blob:http://localhost/abc';
    const blob = { dummy: true };
    const fetchMock = jest.fn(async () => ({ blob: async () => blob }));
    (globalThis as { fetch?: unknown }).fetch = fetchMock;

    class MockFileReader {
      result: string | null = null;
      onloadend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL(value: unknown) {
        expect(value).toBe(blob);
        this.result = 'data:image/png;base64,ZZZ';
        this.onloadend?.();
      }
    }
    (globalThis as { FileReader?: unknown }).FileReader = MockFileReader;

    await expect(persistVehiclePhoto(blobUri)).resolves.toBe('data:image/png;base64,ZZZ');
    expect(fetchMock.mock.calls).toEqual([[blobUri]]);
    expect(copied).toEqual([]);
  });

  it('borra solo archivos nuestros y no toca URIs ajenas', async () => {
    await deleteVehiclePhoto('file:///documents/vehicle-photos/photo-1.jpg');
    await deleteVehiclePhoto('file:///cache/ImagePicker/abc.jpg');
    expect(deleted).toEqual(['file:///documents/vehicle-photos/photo-1.jpg']);
  });

  it('al borrar fotos de un servicio no toca las del vehículo', async () => {
    await deleteServicePhoto('file:///documents/service-photos/factura.jpg');
    await deleteServicePhoto('file:///documents/vehicle-photos/photo-1.jpg');
    expect(deleted).toEqual(['file:///documents/service-photos/factura.jpg']);
  });

  it('en web no intenta borrar archivos', async () => {
    setPlatform('web');
    await deleteVehiclePhoto('file:///documents/vehicle-photos/photo-1.jpg');
    await deletePhoto('file:///documents/service-photos/factura.jpg', 'service');
    expect(deleted).toEqual([]);
  });

  it('borra las fotos que ya no están en la lista nueva', async () => {
    await deleteRemovedPhotos(
      [
        'file:///documents/vehicle-photos/keep.jpg',
        'file:///documents/vehicle-photos/drop.jpg',
      ],
      ['file:///documents/vehicle-photos/keep.jpg'],
    );
    expect(deleted).toEqual(['file:///documents/vehicle-photos/drop.jpg']);
  });

  it('borra todas las fotos de un servicio al vaciar la lista', async () => {
    await deleteRemovedPhotos(
      [
        'file:///documents/service-photos/one.jpg',
        'file:///documents/service-photos/two.jpg',
      ],
      undefined,
      'service',
    );
    expect(deleted).toEqual([
      'file:///documents/service-photos/one.jpg',
      'file:///documents/service-photos/two.jpg',
    ]);
  });
});
