import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorText, FieldLabel, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { confirm } from '../lib/confirm';
import { MAX_PLATE_LENGTH, normalizePlate, validatePlate } from '../lib/plate';
import {
  MAX_VEHICLE_PHOTOS,
  deleteRemovedPhotos,
  deleteVehiclePhoto,
  persistVehiclePhoto,
} from '../lib/photos';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { HONDA_MODELS, type HondaModel, type Vehicle } from '../types';
import * as ImagePicker from 'expo-image-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'Registrar'>;

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1980;
const MAX_YEAR = CURRENT_YEAR + 1;

export default function RegistrarCarroScreen({ navigation, route }: Props) {
  const editing = Boolean(route.params?.edit);
  const { vehicle, saveVehicleData } = useApp();

  const [model, setModel] = useState<HondaModel>(vehicle?.model ?? 'Civic');
  const [modelOther, setModelOther] = useState(vehicle?.modelOther ?? '');
  const [year, setYear] = useState(vehicle ? String(vehicle.year) : '');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [currentKm, setCurrentKm] = useState(vehicle ? String(vehicle.currentKm) : '');
  const [avgKmPerMonth, setAvgKmPerMonth] = useState(vehicle ? String(vehicle.avgKmPerMonth) : '');
  const [photoUris, setPhotoUris] = useState<string[]>(vehicle?.photoUris ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const title = editing ? 'Editar vehículo' : 'Registrar tu Honda';
  const subtitle = useMemo(
    () =>
      editing
        ? 'Actualiza los datos para recalcular las próximas revisiones y el recordatorio.'
        : 'Empezamos con Honda y el plan de FACO, el mismo para todos los modelos de la agencia en Costa Rica.',
    [editing],
  );

  const remainingPhotos = MAX_VEHICLE_PHOTOS - photoUris.length;

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
        const uri = await persistVehiclePhoto(result.assets[0].uri, result.assets[0].mimeType);
        setPhotoUris((current) => [...current, uri].slice(0, MAX_VEHICLE_PHOTOS));
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
        persisted.push(await persistVehiclePhoto(asset.uri, asset.mimeType));
      }
      setPhotoUris((current) => [...current, ...persisted].slice(0, MAX_VEHICLE_PHOTOS));
    } catch {
      setErrors((current) => ({
        ...current,
        photos: 'No pudimos agregar la foto. Intentá de nuevo.',
      }));
    }
  }

  async function removePhoto(uri: string) {
    const ok = await confirm('Quitar foto', '¿Querés quitar esta foto del vehículo?', {
      cancelText: 'Cancelar',
      confirmText: 'Quitar',
      destructive: true,
    });
    if (!ok) return;
    await deleteVehiclePhoto(uri);
    setPhotoUris((current) => current.filter((item) => item !== uri));
  }

  async function onSubmit() {
    const nextErrors: Record<string, string> = {};
    if (model === 'Otros' && !modelOther.trim()) {
      nextErrors.modelOther = 'Indicá el modelo.';
    }
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < MIN_YEAR || parsedYear > MAX_YEAR) {
      nextErrors.year = `Año entre ${MIN_YEAR} y ${MAX_YEAR}.`;
    }
    const normalizedPlate = normalizePlate(plate);
    const plateError = validatePlate(normalizedPlate);
    if (plateError) {
      nextErrors.plate = plateError;
    }
    const parsedKm = Number(currentKm.replace(/,/g, ''));
    if (!Number.isFinite(parsedKm) || parsedKm < 0) {
      nextErrors.currentKm = 'Ingresá el kilometraje actual (0 o más).';
    }
    const parsedAvg = Number(avgKmPerMonth.replace(/,/g, ''));
    if (!Number.isFinite(parsedAvg) || parsedAvg <= 0) {
      nextErrors.avgKmPerMonth = 'Ingresá los kilómetros promedio por mes (mayor a 0).';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const nextVehicle: Vehicle = {
      brand: 'Honda',
      dealerId: 'faco',
      model,
      modelOther: model === 'Otros' ? modelOther.trim() : undefined,
      year: parsedYear,
      currentKm: Math.round(parsedKm),
      avgKmPerMonth: parsedAvg,
      updatedAt: new Date().toISOString(),
      plate: normalizedPlate || undefined,
      photoUris: photoUris.length > 0 ? photoUris : undefined,
    };

    setSaving(true);
    try {
      await deleteRemovedPhotos(vehicle?.photoUris, nextVehicle.photoUris);
      await saveVehicleData(nextVehicle);
      if (editing) {
        navigation.goBack();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={editing ? ['bottom'] : ['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>My Car Maintenance</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.disclaimer}>
            App independiente. No está afiliada, patrocinada ni respaldada por Honda ni por Franz
            Amrhein & Co. (FACO). Las marcas mencionadas pertenecen a sus dueños.
          </Text>

          <FieldLabel>Marca</FieldLabel>
          <View style={styles.locked}>
            <Text style={styles.lockedText}>Honda</Text>
          </View>

          <FieldLabel>Modelo</FieldLabel>
          <View style={styles.modelGrid}>
            {HONDA_MODELS.map((item) => {
              const selected = item === model;
              return (
                <Pressable
                  key={item}
                  onPress={() => setModel(item)}
                  style={[styles.modelChip, selected && styles.modelChipSelected]}
                >
                  <Text style={[styles.modelChipText, selected && styles.modelChipTextSelected]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
          {model === 'Otros' ? (
            <>
              <TextInput
                value={modelOther}
                onChangeText={setModelOther}
                placeholder="¿Cuál modelo?"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="words"
              />
              <ErrorText message={errors.modelOther} />
            </>
          ) : null}

          <FieldLabel>Año</FieldLabel>
          <TextInput
            value={year}
            onChangeText={setYear}
            placeholder={`Por ejemplo, ${CURRENT_YEAR}`}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={4}
          />
          <ErrorText message={errors.year} />

          <FieldLabel>Número de placa</FieldLabel>
          <TextInput
            value={plate}
            onChangeText={(value) => setPlate(value.toUpperCase())}
            placeholder="Ej: BCD123"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={MAX_PLATE_LENGTH}
          />
          <Text style={styles.hint}>Opcional, pero ayuda a identificar tu carro.</Text>
          <ErrorText message={errors.plate} />

          <FieldLabel>Kilometraje actual</FieldLabel>
          <TextInput
            value={currentKm}
            onChangeText={setCurrentKm}
            placeholder="Por ejemplo, 45000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={styles.input}
          />
          <ErrorText message={errors.currentKm} />

          <FieldLabel>Kilómetros promedio por mes</FieldLabel>
          <TextInput
            value={avgKmPerMonth}
            onChangeText={setAvgKmPerMonth}
            placeholder="Por ejemplo, 1200"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Lo usamos para estimar la fecha de cada revisión y programar el recordatorio.
          </Text>
          <ErrorText message={errors.avgKmPerMonth} />

          <FieldLabel>Fotos del vehículo</FieldLabel>
          <Text style={styles.hint}>
            Opcional. Hasta {MAX_VEHICLE_PHOTOS} fotos, desde la galería o la cámara.
          </Text>
          {photoUris.length > 0 ? (
            <View style={styles.photoRow}>
              {photoUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} accessibilityLabel={`Foto ${index + 1} del vehículo`} />
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
            <Text style={styles.hint}>Ya agregaste el máximo de {MAX_VEHICLE_PHOTOS} fotos.</Text>
          )}
          <ErrorText message={errors.photos} />

          <View style={styles.footer}>
            <PrimaryButton
              label={editing ? 'Guardar cambios' : 'Ver mi plan de mantenimiento'}
              onPress={onSubmit}
              loading={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  kicker: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 8 },
  locked: {
    backgroundColor: '#EEEFF2',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lockedText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  modelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  modelChip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modelChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modelChipText: { color: colors.ink, fontWeight: '700' },
  modelChipTextSelected: { color: colors.white },
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
  hint: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 8 },
  disclaimer: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
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
