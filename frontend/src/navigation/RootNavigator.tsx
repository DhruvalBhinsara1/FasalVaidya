import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import HistoryScreen from '../screens/HistoryScreen';

export type RootStackParamList = {
  Home: undefined;
  Scan: { cropId: number } | undefined;
  History: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Leaf' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Scan History' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
