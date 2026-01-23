/**
 * FasalVaidya - AI Crop Health Advisor
 * =====================================
 * Main Application Entry Point
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { hasSeenOnboarding, LanguageContext, loadLanguage } from './src/i18n';
import {
    CameraScreen,
    ChatHistoryScreen,
    ChatScreen,
    HistoryScreen,
    HomeScreen,
    ReportScreen,
    ResultsScreen,
    SettingsScreen,
} from './src/screens';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import { initializeSync } from './src/sync';
import { colors } from './src/theme';
import { initializeDeviceId } from './src/utils/deviceId';

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Camera: { cropId: number };
  Results: { scanResult: any };
  History: undefined;
  Settings: undefined;
  Chat: { scanId?: number; cropId?: number; sessionId?: string };
  ChatHistory: undefined;
  LanguageSelection: { onboarding?: boolean } | undefined;
  Report: { scanId: string; cropName?: string };
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
  const [language, setLanguageContext] = useState('en');
  const [initialRoute, setInitialRoute] = useState<'Home' | 'LanguageSelection'>('Home');

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize device identity FIRST (before any API calls)
        await initializeDeviceId();
        
        // Initialize offline sync system
        await initializeSync({
          autoSyncEnabled: true,
          syncIntervalMinutes: 5,
        });
        console.log('✅ Offline sync initialized');
        
        const lang = await loadLanguage();
        setLanguageContext(lang);
        const seen = await hasSeenOnboarding();
        if (!seen) setInitialRoute('LanguageSelection');
        setTimeout(() => {
          setIsReady(true);
        }, 500);
      } catch (error) {
        console.error('⚠️ Initialization error:', error);
        // Continue app startup even if sync fails
        const lang = await loadLanguage();
        setLanguageContext(lang);
        const seen = await hasSeenOnboarding();
        if (!seen) setInitialRoute('LanguageSelection');
        setTimeout(() => {
          setIsReady(true);
        }, 500);
      }
    };
    initialize();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguageContext }}>
      <SafeAreaProvider>
        <NavigationContainer key={language}>
          <Stack.Navigator
            initialRouteName={initialRoute}
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
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen 
              name="ChatHistory" 
              component={ChatHistoryScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen 
              name="Report" 
              component={ReportScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} initialParams={{ onboarding: initialRoute === 'LanguageSelection' }} />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </LanguageContext.Provider>
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
