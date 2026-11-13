import { Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  cancelText?: string;
  confirmText?: string;
  destructive?: boolean;
};

function webConfirm(text: string): boolean {
  const scope = (typeof window !== 'undefined' ? window : globalThis) as {
    confirm?: (message?: string) => boolean;
  };
  if (typeof scope.confirm === 'function') {
    return Boolean(scope.confirm(text));
  }
  return false;
}

/**
 * Confirmación multiplataforma: en web usa `window.confirm`
 * (Alert.alert no muestra diálogo en react-native-web) y en nativo
 * usa Alert.alert. Devuelve true si la persona confirma.
 */
export function confirm(title: string, message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const cancelText = options.cancelText ?? 'Cancelar';
  const confirmText = options.confirmText ?? 'Eliminar';
  const destructive = options.destructive ?? true;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(webConfirm(text));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
