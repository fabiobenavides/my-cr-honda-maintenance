import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatDate, formatKm } from './format';
import type { UpcomingService } from './schedule';

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

export async function scheduleNextServiceReminder(
  service: UpcomingService | undefined,
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }

  if (!service?.estimatedDate) {
    return;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const triggerDate = service.estimatedDate;
    if (triggerDate.getTime() <= Date.now() + 5_000) {
      return;
    }

    const radiator = service.includesRadiator
      ? ' Incluye cambio de líquido de radiador.'
      : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Próximo mantenimiento de tu carro',
        body: `Revisión ${service.code} a los ${formatKm(service.km)}, estimada para el ${formatDate(triggerDate)}.${radiator}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch {
    // Local notifications pueden fallar en Expo Go; no bloqueamos la app.
  }
}
