import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorText, FieldLabel, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import { getPlan } from '../data/faco-honda';
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
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const plan = vehicle ? getPlan(vehicle.brand, vehicle.dealerId) : undefined;
    const inferred = serviceAtKm(parsedKm, plan);
    const record: ServiceRecord = {
      id: `${Date.now()}`,
      date: isoDate!,
      km: Math.round(parsedKm),
      workshop: workshop.trim(),
      cost: parsedCost,
      serviceCode: prefillCode ?? inferred?.code ?? 'A',
      includesRadiator: prefillRadiator ?? inferred?.includesRadiator ?? false,
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
          onChangeText={setKm}
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
  footer: { marginTop: spacing.lg },
});
