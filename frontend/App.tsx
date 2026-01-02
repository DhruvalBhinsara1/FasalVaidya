/**
 * FasalVaidya - AI Crop Health Advisor
 * =====================================
 * Main Application Entry Point
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import {
  HomeScreen,
  CameraScreen,
  ResultsScreen,
  HistoryScreen,
  SettingsScreen,
} from './src/screens';
import { loadLanguage } from './src/i18n';
import { colors } from './src/theme';

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Camera: { cropId: number };
  Results: { scanResult: any };
  History: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingLogo}>🌱</Text>
    <Text style={styles.loadingTitle}>FasalVaidya</Text>
    <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
  </View>
);

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      // Load saved language preference
      await loadLanguage();
      
      // Simulate brief loading for smoother UX
      setTimeout(() => {
        setIsReady(true);
      }, 500);
    };

    initialize();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen 
            name="Results" 
            component={ResultsScreen}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingLogo: {
    fontSize: 80,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 16,
  },
});
