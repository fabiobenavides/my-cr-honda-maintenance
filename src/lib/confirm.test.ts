import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Platform } from 'react-native';
import { confirm } from './confirm';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

type AlertButton = { text?: string; style?: string; onPress?: () => void };
const alertMock = Alert.alert as unknown as jest.Mock;

function setPlatform(os: string) {
  (Platform as { OS: string }).OS = os;
}

describe('confirm', () => {
  afterEach(() => {
    alertMock.mockReset();
    setPlatform('ios');
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('en web usa window.confirm y devuelve true si se acepta', async () => {
    setPlatform('web');
    const confirmFn = jest.fn<(message?: string) => boolean>(() => true);
    Object.defineProperty(globalThis, 'window', {
      value: { confirm: confirmFn },
      configurable: true,
    });

    await expect(confirm('Eliminar registro', '¿Querés borrar Revisión B a los 40 000 km?')).resolves.toBe(
      true,
    );
    expect(confirmFn).toHaveBeenCalledWith(
      'Eliminar registro\n\n¿Querés borrar Revisión B a los 40 000 km?',
    );
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('en web devuelve false si se cancela', async () => {
    setPlatform('web');
    const confirmFn = jest.fn<(message?: string) => boolean>(() => false);
    Object.defineProperty(globalThis, 'window', {
      value: { confirm: confirmFn },
      configurable: true,
    });

    await expect(confirm('Eliminar registro', '¿Querés borrar el registro?')).resolves.toBe(false);
    expect(confirmFn).toHaveBeenCalledTimes(1);
  });

  it('en nativo resuelve true al pulsar Eliminar', async () => {
    setPlatform('ios');
    alertMock.mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as AlertButton[];
      buttons.find((button) => button.style === 'destructive')?.onPress?.();
    });

    await expect(
      confirm('Eliminar registro', '¿Querés borrar Revisión B a los 40 000 km?', {
        cancelText: 'Cancelar',
        confirmText: 'Eliminar',
      }),
    ).resolves.toBe(true);

    expect(alertMock).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertMock.mock.calls[0] as [string, string, AlertButton[]];
    expect(title).toBe('Eliminar registro');
    expect(message).toBe('¿Querés borrar Revisión B a los 40 000 km?');
    expect(buttons.map((button) => ({ text: button.text, style: button.style }))).toEqual([
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive' },
    ]);
  });

  it('en nativo resuelve false al pulsar Cancelar', async () => {
    setPlatform('android');
    alertMock.mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as AlertButton[];
      buttons.find((button) => button.style === 'cancel')?.onPress?.();
    });

    await expect(confirm('Eliminar registro', '¿Querés borrar el registro?')).resolves.toBe(false);
  });
});
