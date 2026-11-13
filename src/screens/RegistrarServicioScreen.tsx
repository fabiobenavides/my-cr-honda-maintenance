import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
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
import { ErrorText, FieldLabel, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { FACO_HONDA_PLAN, getPlan, groupTasksByArea, tasksForService } from '../data/faco-honda';
import { isoToDisplay, parseFlexibleDate, toIsoDate } from '../lib/format';
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

  function toggleTask(taskId: string) {
    const next = new Set(effectiveSelected);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedTaskIds(next);
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
                        color={checked ? colors.hondaRed : colors.muted}
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
