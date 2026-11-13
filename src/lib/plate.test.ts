import { describe, expect, it } from '@jest/globals';
import { MAX_PLATE_LENGTH, normalizePlate, validatePlate } from './plate';

describe('normalizePlate', () => {
  it('recorta, pasa a mayúsculas y quita espacios', () => {
    expect(normalizePlate('  bcd 123 ')).toBe('BCD123');
    expect(normalizePlate('abc-12')).toBe('ABC-12');
    expect(normalizePlate('123456')).toBe('123456');
  });

  it('deja vacío si solo hay espacios', () => {
    expect(normalizePlate('   ')).toBe('');
    expect(normalizePlate('')).toBe('');
  });
});

describe('validatePlate', () => {
  it('acepta vacío porque la placa es opcional', () => {
    expect(validatePlate('')).toBeUndefined();
    expect(validatePlate('   ')).toBeUndefined();
  });

  it('acepta placas típicas de Costa Rica', () => {
    expect(validatePlate('bcd123')).toBeUndefined();
    expect(validatePlate('BCD123')).toBeUndefined();
    expect(validatePlate('123456')).toBeUndefined();
    expect(validatePlate('AB-1234')).toBeUndefined();
  });

  it('rechaza caracteres que no sean letras, números o guion', () => {
    expect(validatePlate('BCD_123')).toBe('Solo letras, números o un guion. Ej: BCD123.');
    expect(validatePlate('BCD.123')).toBe('Solo letras, números o un guion. Ej: BCD123.');
  });

  it(`rechaza más de ${MAX_PLATE_LENGTH} caracteres ya normalizados`, () => {
    expect(validatePlate('ABCD1234567')).toBe('Usá hasta 10 caracteres (letras, números o un guion).');
    expect(validatePlate('abc 12345678')).toBe('Usá hasta 10 caracteres (letras, números o un guion).');
  });
});
