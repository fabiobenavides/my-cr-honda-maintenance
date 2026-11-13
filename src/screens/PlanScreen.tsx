import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Card, PrimaryButton, SecondaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { getPlan } from '../data/faco-honda';
import { formatDate, formatKm } from '../lib/format';
import { pendingTasksFromHistory, upcomingServices } from '../lib/schedule';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { vehicleLabel } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Plan'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function PlanScreen({ navigation }: Props) {
  const { vehicle, history, updateService } = useApp();
  if (!vehicle) return null;

  const plan = getPlan(vehicle.brand, vehicle.dealerId);
  const upcoming = upcomingServices(vehicle.currentKm, {
    count: 12,
    completedKms: history.map((record) => record.km),
    kmPerMonth: vehicle.avgKmPerMonth,
    plan,
  });
  const next = upcoming[0];
  const pendingTasks = plan ? pendingTasksFromHistory(history, plan) : [];

  async function markPendingDone(recordId: string, taskId: string) {
    const record = history.find((item) => item.id === recordId);
    if (!record || !plan) return;
    const currentDone = new Set(record.completedTaskIds ?? []);
    currentDone.add(taskId);
    await updateService(recordId, { completedTaskIds: [...currentDone] });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={styles.kicker}>{plan?.dealerFullName ?? 'Honda Costa Rica'}</Text>
            <Text style={styles.title}>{vehicleLabel(vehicle)}</Text>
            <Text style={styles.meta}>
              {formatKm(vehicle.currentKm)} · {vehicle.avgKmPerMonth.toLocaleString('es-CR')} km/mes
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Registrar', { edit: true })} style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color={colors.hondaRed} />
            <Text style={styles.editLabel}>Editar</Text>
          </Pressable>
        </View>

        {pendingTasks.length > 0 ? (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Tareas pendientes</Text>
            <Text style={styles.sectionHint}>
              Puntos que no se hicieron en una revisión anterior. Marcálos cuando los completes.
            </Text>
            {pendingTasks.map((item) => (
              <Card key={`${item.recordId}-${item.task.id}`} style={styles.card}>
                <View style={styles.pendingRow}>
                  <View style={styles.flex}>
                    <Text style={styles.pendingTask}>{item.task.name}</Text>
                    <Text style={styles.pendingMeta}>
                      Revisión {item.serviceCode} · {formatKm(item.km)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void markPendingDone(item.recordId, item.task.id)}
                    style={({ pressed }) => [styles.markBtn, pressed && styles.markBtnPressed]}
                    hitSlop={6}
                  >
                    <Text style={styles.markLabel}>Hecha</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Próximas revisiones</Text>
        <Text style={styles.sectionHint}>
          Revisión A cada 5.000 km. La B, cada 20.000 km, reemplaza a la A. A los 80.000 km la B incluye
          cambio de líquido de radiador (solo mano de obra).
        </Text>

        {upcoming.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No hay revisiones pendientes en el plan.</Text>
          </Card>
        ) : (
          upcoming.map((service) => (
            <Pressable
              key={service.km}
              onPress={() =>
                navigation.navigate('Detalle', {
                  km: service.km,
                  code: service.code,
                  includesRadiator: service.includesRadiator,
                  estimatedDate: service.estimatedDate?.toISOString() ?? null,
                })
              }
            >
              <Card highlighted={service.isNext} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.serviceName}>
                      Revisión {service.code} · {formatKm(service.km)}
                    </Text>
                    <Text style={styles.serviceDate}>
                      {service.estimatedDate
                        ? service.km <= vehicle.currentKm
                          ? `Vencida o pendiente · ${formatDate(service.estimatedDate)}`
                          : `Fecha estimada: ${formatDate(service.estimatedDate)}`
                        : 'Sin fecha estimada'}
                    </Text>
                  </View>
                  {service.isNext ? <Badge label="Siguiente" tone="red" /> : <Badge label={service.code} />}
                </View>
                {service.includesRadiator ? (
                  <Text style={styles.radiator}>Incluye cambio de líquido de radiador (solo mano de obra).</Text>
                ) : null}
                <Text style={styles.link}>Ver detalle →</Text>
              </Card>
            </Pressable>
          ))
        )}

        {next ? (
          <View style={styles.actions}>
            <PrimaryButton
              label="Registrar esta revisión como hecha"
              onPress={() =>
                navigation.navigate('RegistrarServicio', {
                  prefillKm: next.km,
                  prefillCode: next.code,
                  includesRadiator: next.includesRadiator,
                })
              }
            />
            <View style={{ height: 10 }} />
            <SecondaryButton label="Ver historial" onPress={() => navigation.navigate('Historial')} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.lg, alignItems: 'flex-start' },
  flex: { flex: 1 },
  kicker: {
    color: colors.hondaRed,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4, fontSize: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  editLabel: { color: colors.hondaRed, fontWeight: '700' },
  pendingSection: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  sectionHint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  card: { marginBottom: spacing.sm },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingTask: { fontSize: 15, fontWeight: '700', color: colors.ink },
  pendingMeta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  markBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.hondaRed,
  },
  markBtnPressed: { opacity: 0.85 },
  markLabel: { color: colors.white, fontWeight: '700', fontSize: 13 },
  cardHeader: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  serviceName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  serviceDate: { color: colors.muted, marginTop: 4, fontSize: 13 },
  radiator: { marginTop: 8, color: colors.hondaRedDark, fontSize: 13, fontWeight: '600' },
  link: { marginTop: 10, color: colors.hondaRed, fontWeight: '700' },
  empty: { color: colors.muted },
  actions: { marginTop: spacing.md },
});
