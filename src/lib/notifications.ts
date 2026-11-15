import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatDate, formatKm } from './format';
import { effectiveDueDate, type TimeReminder, type UpcomingService } from './schedule';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // En Expo Go (Android) el handler nativo a veces no expone remove() y tira TypeError.
}

async function scheduleAt(date: Date, title: string, body: string): Promise<void> {
  if (date.getTime() <= Date.now() + 5_000) {
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

/**
 * Programa (solo en Android/iOS) el aviso de la próxima revisión en la fecha
 * que llegue primero (km estimado o límite por tiempo) y un aviso por cada
 * recordatorio por tiempo (aceite 6 meses, líquido de frenos 3 años).
 */
export async function scheduleNextServiceReminder(
  service: UpcomingService | undefined,
  reminders: TimeReminder[] = [],
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }

  const serviceDate = service ? effectiveDueDate(service) : null;
  const timeOnly = reminders.filter((reminder) => reminder.dueBy === 'tiempo');
  if (!serviceDate && timeOnly.length === 0) {
    return;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    if (service && serviceDate) {
      const radiator = service.includesRadiator ? ' Incluye cambio de líquido de radiador.' : '';
      const byTime =
        service.timeDueDate && serviceDate.getTime() === service.timeDueDate.getTime()
          ? ' Toca por tiempo antes de llegar al kilometraje.'
          : '';
      await scheduleAt(
        serviceDate,
        'Próximo mantenimiento de tu carro',
        `Revisión ${service.code} a los ${formatKm(service.km)}, para el ${formatDate(serviceDate)}.${byTime}${radiator}`,
      );
    }

    for (const reminder of timeOnly) {
      // Si la próxima revisión ya se adelantó por esta misma regla, no se repite el aviso.
      if (service?.timeRuleIds?.includes(reminder.rule.id) && serviceDate) continue;
      await scheduleAt(
        reminder.dueDate,
        `${reminder.rule.name}: toca por tiempo`,
        reminder.rule.source,
      );
    }
  } catch {
    // Local notifications pueden fallar en Expo Go; no bloqueamos la app.
  }
}
