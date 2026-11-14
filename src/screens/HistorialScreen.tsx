import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PhotoViewer } from '../components/PhotoViewer';
import { Badge, Card, PrimaryButton, SecondaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { FACO_HONDA_PLAN, getPlan } from '../data/faco-honda';
import { confirm } from '../lib/confirm';
import { formatColon, formatIsoDate, formatKm } from '../lib/format';
import { buildTimeline, totalSpent, type TimelineEntry } from '../lib/repairs';
import { pendingTaskCountForRecord } from '../lib/schedule';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Historial'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HistorialScreen({ navigation }: Props) {
  const { vehicle, history, repairs, deleteService, deleteRepair } = useApp();
  const plan = (vehicle && getPlan(vehicle.brand, vehicle.dealerId)) || FACO_HONDA_PLAN;
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const timeline = buildTimeline(history, repairs);
  const total = totalSpent(history, repairs);

  async function confirmDelete(entry: TimelineEntry, label: string) {
    const accepted = await confirm('Eliminar registro', `¿Querés borrar ${label}?`, {
      cancelText: 'Cancelar',
      confirmText: 'Eliminar',
    });
    if (!accepted) return;
    if (entry.kind === 'repair') {
      await deleteRepair(entry.record.id);
    } else {
      await deleteService(entry.record.id);
    }
  }

  function renderPhotos(id: string, photos: string[], noun: string) {
    if (photos.length === 0) return null;
    return (
      <View style={styles.photoRow}>
        {photos.map((uri, index) => (
          <Pressable
            key={`${id}-${uri}-${index}`}
            onPress={() => setViewerUri(uri)}
            accessibilityLabel={`Ver foto ${index + 1} del ${noun}`}
          >
            <Image source={{ uri }} style={styles.thumb} accessibilityLabel={`Foto ${index + 1} del ${noun}`} />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>
          Revisiones del plan y arreglos independientes, con fecha, taller, monto y fotos opcionales.
        </Text>

        <View style={styles.actions}>
          <PrimaryButton label="Registrar servicio" onPress={() => navigation.navigate('RegistrarServicio')} />
          <View style={styles.gap} />
          <SecondaryButton label="Registrar arreglo" onPress={() => navigation.navigate('RegistrarArreglo')} />
        </View>

        {timeline.length > 0 ? (
          <Text style={styles.total}>
            Total gastado: <Text style={styles.totalAmount}>{formatColon(total)}</Text>
          </Text>
        ) : null}

        {timeline.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Todavía no hay registros</Text>
            <Text style={styles.emptyText}>
              Cuando hagas una revisión A o B, anotala acá para no volver a sugerirte ese kilometraje. Los
              arreglos fuera del plan también se guardan acá.
            </Text>
          </Card>
        ) : (
          timeline.map((entry) => {
            if (entry.kind === 'repair') {
              const record = entry.record;
              const label = `el arreglo "${record.description}"`;
              const details = [record.workshop, record.km != null ? formatKm(record.km) : null]
                .filter(Boolean)
                .join(' · ');
              return (
                <Card key={`repair-${record.id}`} style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <View style={styles.badgeWrapTop}>
                        <Badge label="Arreglo" tone="green" />
                      </View>
                      <Text style={styles.service}>{record.description}</Text>
                      <Text style={styles.detail}>{formatIsoDate(record.date)}</Text>
                      {details ? <Text style={styles.detail}>{details}</Text> : null}
                      <Text style={styles.cost}>{formatColon(record.cost)}</Text>
                      {renderPhotos(record.id, record.photoUris ?? [], 'arreglo')}
                    </View>
                    <Pressable onPress={() => void confirmDelete(entry, label)} hitSlop={8}>
                      <Text style={styles.delete}>Eliminar</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            }

            const record = entry.record;
            const label = `Revisión ${record.serviceCode} a los ${formatKm(record.km)}`;
            const pendingCount = pendingTaskCountForRecord(record, plan);
            return (
              <Card key={`service-${record.id}`} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <View style={styles.badgeWrapTop}>
                      <Badge label="Revisión" />
                    </View>
                    <Text style={styles.service}>{label}</Text>
                    <Text style={styles.detail}>{formatIsoDate(record.date)}</Text>
                    <Text style={styles.detail}>{record.workshop || 'Taller no indicado'}</Text>
                    <Text style={styles.cost}>{formatColon(record.cost)}</Text>
                    {record.includesRadiator || pendingCount > 0 ? (
                      <View style={styles.badgeWrap}>
                        {record.includesRadiator ? <Badge label="Incluyó radiador" tone="red" /> : null}
                        {pendingCount > 0 ? (
                          <Badge
                            label={pendingCount === 1 ? '1 pendiente' : `${pendingCount} pendientes`}
                            tone="red"
                          />
                        ) : null}
                      </View>
                    ) : null}
                    {renderPhotos(record.id, record.photoUris ?? [], 'servicio')}
                  </View>
                  <Pressable onPress={() => void confirmDelete(entry, label)} hitSlop={8}>
                    <Text style={styles.delete}>Eliminar</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
      <PhotoViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4, marginBottom: spacing.md, fontSize: 14, lineHeight: 20 },
  actions: { marginBottom: spacing.md },
  gap: { height: 10 },
  total: { color: colors.muted, fontSize: 14, marginBottom: spacing.sm },
  totalAmount: { color: colors.ink, fontWeight: '800' },
  badgeWrapTop: { flexDirection: 'row', marginBottom: 6 },
  emptyCard: { paddingVertical: spacing.lg },
  emptyTitle: { fontWeight: '800', fontSize: 16, color: colors.ink, marginBottom: 6 },
  emptyText: { color: colors.muted, lineHeight: 20 },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  service: { fontWeight: '800', fontSize: 16, color: colors.ink },
  detail: { color: colors.muted, marginTop: 3, fontSize: 14 },
  cost: { marginTop: 8, fontWeight: '700', fontSize: 16, color: colors.ink },
  badgeWrap: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photoRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.line,
  },
  delete: { color: colors.primary, fontWeight: '700' },
});
