import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function PhotoViewer({
  uri,
  onClose,
  accessibilityLabel = 'Foto en tamaño completo',
}: {
  uri: string | null;
  onClose: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar foto">
        <Pressable
          onPress={onClose}
          style={styles.close}
          accessibilityLabel="Cerrar foto"
          hitSlop={8}
        >
          <Ionicons name="close" size={22} color={colors.white} />
        </Pressable>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={accessibilityLabel}
          />
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: '100%',
    height: '80%',
  },
  close: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
