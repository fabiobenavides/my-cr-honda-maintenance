export const MAX_PLATE_LENGTH = 10;

/** Letras, números y un guion. Sin formato estricto (BCD123 y 123456 sirven). */
const PLATE_PATTERN = /^[A-Z0-9-]+$/;

/** Recorta, pasa a mayúsculas y quita espacios internos. */
export function normalizePlate(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Validación ligera. Vacío es válido porque la placa es opcional.
 * Devuelve un mensaje de error en español o undefined si está bien.
 */
export function validatePlate(value: string): string | undefined {
  const normalized = normalizePlate(value);
  if (!normalized) return undefined;
  if (normalized.length > MAX_PLATE_LENGTH) {
    return 'Usá hasta 10 caracteres (letras, números o un guion).';
  }
  if (!PLATE_PATTERN.test(normalized)) {
    return 'Solo letras, números o un guion. Ej: BCD123.';
  }
  return undefined;
}
