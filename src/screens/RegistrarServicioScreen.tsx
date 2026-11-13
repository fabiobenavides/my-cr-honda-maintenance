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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ErrorText, FieldLabel, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { FACO_HONDA_PLAN, getPlan, groupTasksByArea, tasksForService } from '../data/faco-honda';
import { confirm } from '../lib/confirm';
import { isoToDisplay, parseFlexibleDate, toIsoDate } from '../lib/format';
import {
  MAX_SERVICE_PHOTOS,
  deleteServicePhoto,
  optionalPhotoUris,
  persistServicePhoto,
} from '../lib/photos';
import { serviceAtKm } from '../lib/schedule';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { ServiceRecord } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrarServicio'>;

export default function RegistrarServicioScreen({ navigation, route }: Props) {
  const { vehicle, addService, saveVehicleData } = useApp();
  const prefillKm = route.params?.prefillKm;
  const prefillCode = route.params?.prefillCode;
  const prefillRadiator = route.params?.includesRadiator;

  const [date, setDate] = useState(isoToDisplay(toIsoDate(new Date())));
  const [km, setKm] = useState(prefillKm != null ? String(prefillKm) : vehicle ? String(vehicle.currentKm) : '');
  const [workshop, setWorkshop] = useState('FACO');
  const [cost, setCost] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  /** null = todas seleccionadas (default / al cambiar km). */
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string> | null>(null);

  const plan = (vehicle && getPlan(vehicle.brand, vehicle.dealerId)) || FACO_HONDA_PLAN;
  const parsedKmForTasks = Number(String(km).replace(/,/g, ''));
  const serviceKm = Number.isFinite(parsedKmForTasks) && parsedKmForTasks > 0 ? Math.round(parsedKmForTasks) : 0;
  const inferred = serviceKm > 0 ? serviceAtKm(serviceKm, plan) : null;
  const serviceCode = prefillCode ?? inferred?.code ?? 'A';
  const includesRadiator = prefillRadiator ?? inferred?.includesRadiator ?? false;
  const tasks = useMemo(
    () => (serviceKm > 0 ? tasksForService(plan, serviceCode, serviceKm) : []),
    [plan, serviceCode, serviceKm],
  );
  const allTaskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const effectiveSelected = useMemo(() => {
    if (selectedTaskIds == null) return new Set(allTaskIds);
    const next = new Set<string>();
    for (const id of allTaskIds) {
      if (selectedTaskIds.has(id)) next.add(id);
    }
    return next;
  }, [selectedTaskIds, allTaskIds]);

  const grouped = useMemo(() => groupTasksByArea(tasks), [tasks]);
  const remainingPhotos = MAX_SERVICE_PHOTOS - photoUris.length;

  function toggleTask(taskId: string) {
    const next = new Set(effectiveSelected);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedTaskIds(next);
  }

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
        setPhotoUris((current) => [...current, uri].slice(0, MAX_SERVICE_PHOTOS));
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
      setPhotoUris((current) => [...current, ...persisted].slice(0, MAX_SERVICE_PHOTOS));
    } catch {
      setErrors((current) => ({
        ...current,
        photos: 'No pudimos agregar la foto. Intentá de nuevo.',
      }));
    }
  }

  async function removePhoto(uri: string) {
    const ok = await confirm('Quitar foto', '¿Querés quitar esta foto del servicio?', {
      cancelText: 'Cancelar',
      confirmText: 'Quitar',
      destructive: true,
    });
    if (!ok) return;
    await deleteServicePhoto(uri);
    setPhotoUris((current) => current.filter((item) => item !== uri));
  }

  async function onSubmit() {
    const nextErrors: Record<string, string> = {};
    const isoDate = parseFlexibleDate(date);
    if (!isoDate) nextErrors.date = 'Usá el formato DD/MM/AAAA.';
    const parsedKm = Number(String(km).replace(/,/g, ''));
    if (!Number.isFinite(parsedKm) || parsedKm < 0) nextErrors.km = 'Ingresá el kilometraje del servicio.';
    if (!workshop.trim()) nextErrors.workshop = 'Indicá el taller.';
    const parsedCost = Number(String(cost).replace(/,/g, ''));
    if (cost.trim() === '' || !Number.isFinite(parsedCost) || parsedCost < 0) {
      nextErrors.cost = 'Ingresá el costo en colones (0 si no lo tenés).';
    }
    if (tasks.length > 0 && effectiveSelected.size === 0) {
      nextErrors.tasks = 'Seleccioná al menos un punto realizado.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const record: ServiceRecord = {
      id: `${Date.now()}`,
      date: isoDate!,
      km: Math.round(parsedKm),
      workshop: workshop.trim(),
      cost: parsedCost,
      serviceCode,
      includesRadiator,
      completedTaskIds: [...effectiveSelected],
      photoUris: optionalPhotoUris(photoUris, MAX_SERVICE_PHOTOS),
    };

    setSaving(true);
    try {
      await addService(record);
      if (vehicle && record.km > vehicle.currentKm) {
        await saveVehicleData({
          ...vehicle,
          currentKm: record.km,
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
          Anotá la revisión hecha. Si el kilometraje es mayor al actual del carro, lo actualizamos.
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

        <FieldLabel>Kilometraje</FieldLabel>
        <TextInput
          value={km}
          onChangeText={(value) => {
            setKm(value);
            setSelectedTaskIds(null);
          }}
          placeholder="Kilómetros al momento del servicio"
          placeholderTextColor={colors.muted}
          style={styles.input}
          keyboardType="number-pad"
        />
        <ErrorText message={errors.km} />

        <FieldLabel>Taller</FieldLabel>
        <TextInput
          value={workshop}
          onChangeText={setWorkshop}
          placeholder="FACO u otro taller"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <ErrorText message={errors.workshop} />

        <FieldLabel>Costo (₡)</FieldLabel>
        <TextInput
          value={cost}
          onChangeText={setCost}
          placeholder="Por ejemplo, 45000"
          placeholderTextColor={colors.muted}
          style={styles.input}
          keyboardType="number-pad"
        />
        <ErrorText message={errors.cost} />

        <FieldLabel>Fotos del servicio</FieldLabel>
        <Text style={styles.hint}>
          Opcional. Hasta {MAX_SERVICE_PHOTOS} fotos: la factura, un escaneo o el resultado de una prueba.
        </Text>
        {photoUris.length > 0 ? (
          <View style={styles.photoRow}>
            {photoUris.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.thumbWrap}>
                <Image
                  source={{ uri }}
                  style={styles.thumb}
                  accessibilityLabel={`Foto ${index + 1} del servicio`}
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
          <Text style={styles.hint}>Ya agregaste el máximo de {MAX_SERVICE_PHOTOS} fotos.</Text>
        )}
        <ErrorText message={errors.photos} />

        {tasks.length > 0 ? (
          <View style={styles.checklist}>
            <Text style={styles.checklistTitle}>
              Puntos realizados · Revisión {serviceCode}
            </Text>
            <Text style={styles.checklistHint}>
              Todos vienen marcados. Desmarcá lo que el taller no hizo; eso seguirá como pendiente.
            </Text>
            {grouped.map((group) => (
              <View key={group.area} style={styles.group}>
                <Text style={styles.groupTitle}>{group.area}</Text>
                {group.tasks.map((task) => {
                  const checked = effectiveSelected.has(task.id);
                  return (
                    <Pressable
                      key={task.id}
                      onPress={() => toggleTask(task.id)}
                      style={({ pressed }) => [styles.taskRow, pressed && styles.taskPressed]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                    >
                      <Ionicons
                        name={checked ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={checked ? colors.primary : colors.muted}
                      />
                      <Text style={[styles.taskName, !checked && styles.taskNameOff]}>{task.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <ErrorText message={errors.tasks} />
          </View>
        ) : null}

        <View style={styles.footer}>
          <PrimaryButton label="Guardar en el historial" onPress={onSubmit} loading={saving} />
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
  checklist: { marginTop: spacing.lg },
  checklistTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  checklistHint: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: spacing.sm },
  group: { marginTop: spacing.sm },
  groupTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, marginBottom: 4, textTransform: 'uppercase' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  taskPressed: { opacity: 0.7 },
  taskName: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 22 },
  taskNameOff: { color: colors.muted },
  footer: { marginTop: spacing.lg },
});
