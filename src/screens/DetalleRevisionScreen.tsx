import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, FlagBadges, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { FACO_HONDA_PLAN, getPlan, getServiceType, groupTasksByArea, tasksForService } from '../data/faco-honda';
import { formatDate, formatKm } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Detalle'>;

export default function DetalleRevisionScreen({ navigation, route }: Props) {
  const { vehicle } = useApp();
  const { km, code, includesRadiator, estimatedDate } = route.params;
  const plan = (vehicle && getPlan(vehicle.brand, vehicle.dealerId)) || FACO_HONDA_PLAN;
  const service = getServiceType(plan, code);
  const grouped = groupTasksByArea(tasksForService(plan, code, km));
  const estimated = estimatedDate ? new Date(estimatedDate) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>{plan.dealerName} · {plan.brand}</Text>
      <Text style={styles.title}>{service?.name ?? `Revisión ${code}`}</Text>
      <Text style={styles.subtitle}>
        {formatKm(km)}
        {estimated && !Number.isNaN(estimated.getTime()) ? ` · ${formatDate(estimated)}` : ''}
      </Text>
      {service?.subtitle ? <Text style={styles.meta}>{service.subtitle}</Text> : null}
      {includesRadiator ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            En este kilometraje la Revisión B incluye cambio de líquido de radiador (solo mano de obra).
          </Text>
        </View>
      ) : null}

      {grouped.map((group) => (
        <View key={group.area} style={styles.group}>
          <Text style={styles.groupTitle}>{group.area}</Text>
          <Card>
            {group.tasks.map((task, index) => (
              <View key={task.id} style={[styles.task, index < group.tasks.length - 1 && styles.taskBorder]}>
                <Text style={styles.taskName}>{task.name}</Text>
                <FlagBadges flags={task.flags} />
              </View>
            ))}
          </Card>
        </View>
      ))}

      {service?.includedParts?.length ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Repuestos incluidos</Text>
          <Card>
            {service.includedParts.map((part, index) => (
              <View
                key={part.id}
                style={[styles.task, index < service.includedParts!.length - 1 && styles.taskBorder]}
              >
                <View style={styles.partRow}>
                  <Text style={styles.taskName}>{part.name}</Text>
                  {part.flags?.length ? <Badge label="Si aplica" /> : null}
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          label="Registrar como hecha"
          onPress={() =>
            navigation.navigate('RegistrarServicio', {
              prefillKm: km,
              prefillCode: code,
              includesRadiator,
            })
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  kicker: {
    color: colors.hondaRed,
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 16, color: colors.ink, marginTop: 4 },
  meta: { color: colors.muted, marginTop: 4, marginBottom: 8 },
  notice: {
    backgroundColor: colors.warningBg,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  noticeText: { color: colors.warningText, fontWeight: '600', lineHeight: 20 },
  group: { marginTop: spacing.md },
  groupTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  task: { paddingVertical: 10 },
  taskBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  taskName: { fontSize: 15, color: colors.ink, flex: 1 },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { marginTop: spacing.lg },
});
