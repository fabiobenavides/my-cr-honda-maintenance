import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Badge, Card, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { FACO_HONDA_PLAN, getPlan } from '../data/faco-honda';
import { formatColon, formatIsoDate, formatKm } from '../lib/format';
import { pendingTaskCountForRecord } from '../lib/schedule';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Historial'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HistorialScreen({ navigation }: Props) {
  const { vehicle, history, deleteService } = useApp();
  const plan = (vehicle && getPlan(vehicle.brand, vehicle.dealerId)) || FACO_HONDA_PLAN;

  function confirmDelete(id: string, label: string) {
    Alert.alert('Eliminar registro', `¿Querés borrar ${label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void deleteService(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>Servicios que ya hiciste, con fecha, kilómetros, taller y costo.</Text>

        <View style={styles.actions}>
          <PrimaryButton label="Registrar servicio" onPress={() => navigation.navigate('RegistrarServicio')} />
        </View>

        {history.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Todavía no hay servicios registrados</Text>
            <Text style={styles.emptyText}>
              Cuando hagas una revisión A o B, anotala acá para no volver a sugerirte ese kilometraje.
            </Text>
          </Card>
        ) : (
          history.map((record) => {
            const label = `Revisión ${record.serviceCode} a los ${formatKm(record.km)}`;
            const pendingCount = pendingTaskCountForRecord(record, plan);
            return (
              <Card key={record.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.flex}>
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
                  </View>
                  <Pressable onPress={() => confirmDelete(record.id, label)} hitSlop={8}>
                    <Text style={styles.delete}>Eliminar</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4, marginBottom: spacing.md, fontSize: 14, lineHeight: 20 },
  actions: { marginBottom: spacing.md },
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
  delete: { color: colors.hondaRed, fontWeight: '700' },
});
