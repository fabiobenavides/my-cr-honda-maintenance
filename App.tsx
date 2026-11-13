import 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { rootNavigationKey } from './src/navigation/root';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import DetalleRevisionScreen from './src/screens/DetalleRevisionScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import PlanScreen from './src/screens/PlanScreen';
import RegistrarCarroScreen from './src/screens/RegistrarCarroScreen';
import RegistrarServicioScreen from './src/screens/RegistrarServicioScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Historial"
        component={HistorialScreen}
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { ready, vehicle } = useApp();

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Key NavigationContainer (not just the stack). Its state survives an inner
  // remount, and Registrar exists in both stacks, so after the first save the
  // UI used to stay on the form (now titled "Editar vehículo") until reload.
  return (
    <NavigationContainer key={rootNavigationKey(vehicle)}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {vehicle ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="Detalle"
              component={DetalleRevisionScreen}
              options={{ title: 'Detalle de revisión' }}
            />
            <Stack.Screen
              name="RegistrarServicio"
              component={RegistrarServicioScreen}
              options={{ title: 'Registrar servicio' }}
            />
            <Stack.Screen
              name="Registrar"
              component={RegistrarCarroScreen}
              options={{ title: 'Editar vehículo' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Registrar"
            component={RegistrarCarroScreen}
            options={{ headerShown: false, title: 'Registrar carro' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
