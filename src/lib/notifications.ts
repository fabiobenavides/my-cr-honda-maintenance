import * as Notifications from 'expo-notifications';
import { formatDate, formatKm } from './format';
import type { UpcomingService } from './schedule';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function scheduleNextServiceReminder(
  service: UpcomingService | undefined,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!service?.estimatedDate) {
    return;
  }

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
      title: 'Mantenimiento Honda próximo',
      body: `Revisión ${service.code} a los ${formatKm(service.km)}, estimada para el ${formatDate(triggerDate)}.${radiator}`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}
