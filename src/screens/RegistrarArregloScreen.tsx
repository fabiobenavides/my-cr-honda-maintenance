import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ErrorText, FieldLabel, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { confirm } from '../lib/confirm';
import { isoToDisplay, toIsoDate } from '../lib/format';
import { deleteServicePhoto, persistServicePhoto } from '../lib/photos';
import { MAX_REPAIR_PHOTOS, buildRepairRecord, nextCurrentKm } from '../lib/repairs';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrarArreglo'>;

export default function RegistrarArregloScreen({ navigation }: Props) {
  const { vehicle, addRepair, saveVehicleData } = useApp();

  const [date, setDate] = useState(isoToDisplay(toIsoDate(new Date())));
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [km, setKm] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const remainingPhotos = MAX_REPAIR_PHOTOS - photoUris.length;

  async function addPhotos(source: 'library' | 'camera') {
    if (remainingPhotos <= 0) return;
    setErrors((current) => {
      const next = { ...current };
      delete next.photos;
      return next;
    });

    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setErrors((current) => ({
            ...current,
            photos:
              'No pudimos acceder a la cámara. Revisá los permisos de la app e intentá de nuevo.',
          }));
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const uri = await persistServicePhoto(result.assets[0].uri, result.assets[0].mimeType);
        setPhotoUris((current) => [...current, uri].slice(0, MAX_REPAIR_PHOTOS));
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrors((current) => ({
          ...current,
          photos: 'No pudimos acceder a tus fotos. Revisá los permisos de la app e intentá de nuevo.',
        }));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: remainingPhotos > 1,
        selectionLimit: remainingPhotos,
      });
      if (result.canceled || !result.assets?.length) return;
      const persisted: string[] = [];
      for (const asset of result.assets.slice(0, remainingPhotos)) {
        persisted.push(await persistServicePhoto(asset.uri, asset.mimeType));
      }
      setPhotoUris((current) => [...current, ...persisted].slice(0, MAX_REPAIR_PHOTOS));
    } catch {
      setErrors((current) => ({
        ...current,
        photos: 'No pudimos agregar la foto. Intentá de nuevo.',
      }));
    }
  }

  async function removePhoto(uri: string) {
    const ok = await confirm('Quitar foto', '¿Querés quitar esta foto del arreglo?', {
      cancelText: 'Cancelar',
      confirmText: 'Quitar',
      destructive: true,
    });
    if (!ok) return;
    await deleteServicePhoto(uri);
    setPhotoUris((current) => current.filter((item) => item !== uri));
  }

  async function onSubmit() {
    const { record, errors: nextErrors } = buildRepairRecord({
      date,
      description,
      cost,
      workshop,
      km,
      photoUris,
    });
    setErrors(nextErrors);
    if (!record) return;

    setSaving(true);
    try {
      await addRepair(record);
      const newKm = vehicle ? nextCurrentKm(vehicle.currentKm, record) : null;
      if (vehicle && newKm != null) {
        await saveVehicleData({
          ...vehicle,
          currentKm: newKm,
          updatedAt: new Date().toISOString(),
        });
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Anotá un arreglo que le hiciste al carro fuera del plan de mantenimiento: una llanta, la batería,
          un golpe… Se guarda en el historial con la fecha en que pasó y no cambia las revisiones sugeridas.
        </Text>

        <FieldLabel>Fecha</FieldLabel>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={colors.muted}
          style={styles.input}
          keyboardType="numbers-and-punctuation"
        />
        <ErrorText message={errors.date} />

        <FieldLabel>¿Qué se le hizo?</FieldLabel>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Por ejemplo, cambio de batería"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlignVertical="top"
        />
        <ErrorText message={errors.description} />

        <FieldLabel>Monto (₡)</FieldLabel>
        <TextInput
          value={cost}
          onChangeText={setCost}
          placeholder="Por ejemplo, 85000"
          placeholderTextColor={colors.muted}
          style={styles.input}
          keyboardType="number-pad"
        />
        <ErrorText message={errors.cost} />

        <FieldLabel>Taller o lugar (opcional)</FieldLabel>
        <TextInput
          value={workshop}
          onChangeText={setWorkshop}
          placeholder="Dónde se hizo"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <FieldLabel>Kilometraje (opcional)</FieldLabel>
        <TextInput
          value={km}
          onChangeText={setKm}
          placeholder={vehicle ? `Actual: ${vehicle.currentKm}` : 'Kilómetros al momento del arreglo'}
          placeholderTextColor={colors.muted}
          style={styles.input}
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>Si es mayor al actual del carro, lo actualizamos.</Text>
        <ErrorText message={errors.km} />

        <FieldLabel>Fotos del arreglo</FieldLabel>
        <Text style={styles.hint}>
          Opcional. Hasta {MAX_REPAIR_PHOTOS} fotos: la factura, el repuesto o cómo quedó.
        </Text>
        {photoUris.length > 0 ? (
          <View style={styles.photoRow}>
            {photoUris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                <Image
                  source={{ uri }}
                  style={styles.thumb}
                  accessibilityLabel={`Foto ${index + 1} del arreglo`}
                />
                <Pressable
                  onPress={() => void removePhoto(uri)}
                  style={styles.removeThumb}
                  accessibilityLabel="Quitar foto"
                  hitSlop={6}
                >
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {remainingPhotos > 0 ? (
          <View style={styles.photoActions}>
            <Pressable
              onPress={() => void addPhotos('library')}
              style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
              accessibilityLabel="Agregar foto desde la galería"
            >
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={styles.photoBtnLabel}>Galería</Text>
            </Pressable>
            <Pressable
              onPress={() => void addPhotos('camera')}
              style={({ pressed }) => [styles.photoBtn, pressed && styles.photoBtnPressed]}
              accessibilityLabel="Tomar foto con la cámara"
            >
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.photoBtnLabel}>Cámara</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hint}>Ya agregaste el máximo de {MAX_REPAIR_PHOTOS} fotos.</Text>
        )}
        <ErrorText message={errors.photos} />

        <View style={styles.footer}>
          <PrimaryButton label="Guardar arreglo" onPress={onSubmit} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  lead: { color: colors.muted, marginBottom: spacing.lg, lineHeight: 22, fontSize: 15 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
  },
  multiline: { minHeight: 96, paddingTop: 12 },
  hint: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 8 },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.sm,
  },
  thumbWrap: { width: 84, height: 84 },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.line,
  },
  removeThumb: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  photoBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  photoBtnPressed: { opacity: 0.85 },
  photoBtnLabel: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  footer: { marginTop: spacing.lg },
});
