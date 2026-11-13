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
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorText, FieldLabel, PrimaryButton } from '../components/ui';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { HONDA_MODELS, type HondaModel, type Vehicle } from '../types';

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
  const [currentKm, setCurrentKm] = useState(vehicle ? String(vehicle.currentKm) : '');
  const [avgKmPerMonth, setAvgKmPerMonth] = useState(vehicle ? String(vehicle.avgKmPerMonth) : '');
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

  async function onSubmit() {
    const nextErrors: Record<string, string> = {};
    if (model === 'Otros' && !modelOther.trim()) {
      nextErrors.modelOther = 'Indicá el modelo.';
    }
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear) || parsedYear < MIN_YEAR || parsedYear > MAX_YEAR) {
      nextErrors.year = `Año entre ${MIN_YEAR} y ${MAX_YEAR}.`;
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
    };

    setSaving(true);
    try {
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
          <Text style={styles.kicker}>Mantenimiento Honda</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

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
    color: colors.hondaRed,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: spacing.lg },
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
    backgroundColor: colors.hondaRed,
    borderColor: colors.hondaRed,
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
  hint: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 4 },
  footer: { marginTop: spacing.lg },
});
