import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { uploadScan } from '../api/client';
import { theme } from '../theme/theme';

const PADDING = 16;

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

interface CapturedPhoto {
  uri: string;
}

// Helper to get severity info
const getSeverity = (score: number) => {
  if (score >= 0.6) return { label: 'Critical', color: '#DC2626', emoji: '🔴' };
  if (score >= 0.3) return { label: 'Attention', color: '#F59E0B', emoji: '🟡' };
  return { label: 'Healthy', color: '#10B981', emoji: '🟢' };
};

export default function ScanScreen({ route }: Props) {
  const cropId = route.params?.cropId ?? 1;
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleTorch = () => {
    setTorch((current) => !current);
  };

  const onCameraReady = useCallback(() => {
    console.log('Camera is ready');
    setCameraReady(true);
  }, []);

  const takePicture = async () => {
    try {
      if (!cameraRef.current) {
        console.log('Camera ref is null');
        Alert.alert('Camera not ready', 'Please wait for camera to initialize or use Gallery.');
        return;
      }

      if (!cameraReady) {
        console.log('Camera not ready yet');
        Alert.alert('Camera not ready', 'Please wait a moment and try again.');
        return;
      }
      
      // Small delay for iOS
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.8,
        skipProcessing: false,
      });
      
      console.log('Photo result:', photo);
      
      if (photo && photo.uri) {
        console.log('Photo captured:', photo.uri);
        setCaptured({ uri: photo.uri });
        setResult(null);
      } else {
        Alert.alert('Capture failed', 'Photo was empty. Try using Gallery instead.');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      Alert.alert(
        'Camera Issue', 
        `Could not capture photo: ${err.message || 'Unknown error'}. Please use the Gallery button instead.`,
        [{ text: 'OK' }]
      );
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setCaptured({ uri: result.assets[0].uri });
        setResult(null);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to pick image from gallery.');
    }
  };

  const sendToBackend = async () => {
    if (!captured) {
      Alert.alert('No photo', 'Capture a leaf photo first.');
      return;
    }
    setUploading(true);
    try {
      const response = await uploadScan(captured.uri, cropId);
      console.log('=== SCAN RESPONSE ===');
      console.log('Has heatmap:', !!response.heatmap);
      console.log('Heatmap length:', response.heatmap?.length || 0);
      console.log('Full response keys:', Object.keys(response));
      
      // Check for error response
      if (response.error) {
        Alert.alert('Image Issue', response.error);
        setCaptured(null); // Reset to let user try again
        return;
      }
      
      setResult(response);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Could not upload image. Please retry.';
      Alert.alert('Upload failed', errorMsg);
    } finally {
      setUploading(false);
    }
  };

  if (!permission || !permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.text}>Camera permission needed.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  // Render nutrient card
  const renderNutrientCard = (nutrient: string, label: string, score: number, confidence: number, recommendation: string) => {
    const severity = getSeverity(score);
    return (
      <View style={styles.nutrientCard} key={nutrient}>
        <View style={styles.nutrientHeader}>
          <Text style={styles.nutrientLabel}>{label}</Text>
          <View style={[styles.severityBadge, { backgroundColor: severity.color + '20' }]}>
            <Text style={[styles.severityText, { color: severity.color }]}>
              {severity.emoji} {severity.label}
            </Text>
          </View>
        </View>
        <View style={styles.scoreRow}>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${score * 100}%`, backgroundColor: severity.color }]} />
          </View>
          <Text style={styles.scoreValue}>{Math.round(score * 100)}%</Text>
        </View>
        <Text style={styles.confidenceText}>Confidence: {Math.round(confidence * 100)}%</Text>
        <Text style={styles.recText}>{recommendation}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {!captured && !result && (
        <View style={styles.cameraContainer}>
          <CameraView 
            style={styles.camera} 
            facing={facing} 
            ref={cameraRef}
            enableTorch={torch}
            onCameraReady={onCameraReady}
          />
          <View style={styles.cameraControls}>
            <Pressable style={styles.controlButton} onPress={toggleTorch}>
              <Text style={styles.controlButtonText}>{torch ? '🔦' : '💡'}</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={toggleCameraFacing}>
              <Text style={styles.controlButtonText}>🔄</Text>
            </Pressable>
          </View>
          {!cameraReady && (
            <View style={styles.cameraLoading}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.cameraLoadingText}>Loading camera...</Text>
            </View>
          )}
        </View>
      )}

      {captured && !result && (
        <Image source={{ uri: captured.uri }} style={styles.preview} resizeMode="cover" />
      )}

      {!result && (
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => { setCaptured(null); setTorch(false); }}>
            <Text style={styles.secondaryButtonText}>{captured ? 'Retake' : 'Reset'}</Text>
          </Pressable>
          {!captured && (
            <Pressable style={styles.galleryButton} onPress={pickImage}>
              <Text style={styles.galleryButtonText}>📁 Gallery</Text>
            </Pressable>
          )}
          <Pressable style={styles.primaryButton} onPress={captured ? sendToBackend : takePicture} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{captured ? 'Analyze' : 'Capture'}</Text>
            )}
          </Pressable>
        </View>
      )}

      {result && (
        <View style={styles.resultsContainer}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Diagnosis Report</Text>
            <Text style={styles.resultSubtitle}>Scan #{result.scan_id} • {result.crop_name || 'Crop'}</Text>
          </View>

          {/* Heatmap Section */}
          {result.heatmap ? (
            <View style={styles.heatmapSection}>
              <Text style={styles.sectionTitle}>🔥 Affected Areas (Heatmap)</Text>
              <Image 
                source={{ uri: result.heatmap }} 
                style={styles.heatmapImage} 
                resizeMode="contain"
              />
              <Text style={styles.heatmapHint}>
                Warm colors (red/orange) indicate areas with detected deficiency patterns
              </Text>
            </View>
          ) : null}

          {/* NPK Results */}
          <View style={styles.npkSection}>
            <Text style={styles.sectionTitle}>📊 NPK Analysis</Text>
            {renderNutrientCard('n', 'Nitrogen (N)', result.n_score, result.n_confidence, result.n_rec || '')}
            {renderNutrientCard('p', 'Phosphorus (P)', result.p_score, result.p_confidence, result.p_rec || '')}
            {renderNutrientCard('k', 'Potassium (K)', result.k_score, result.k_confidence, result.k_rec || '')}
          </View>

          {/* Action Button */}
          <Pressable style={styles.newScanButton} onPress={() => { setCaptured(null); setResult(null); }}>
            <Text style={styles.newScanButtonText}>📷 New Scan</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: PADDING,
    paddingBottom: 32,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  cameraContainer: {
    height: 350,
    position: 'relative',
  },
  camera: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cameraControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  cameraLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  cameraLoadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 24,
  },
  flipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButtonText: {
    fontSize: 24,
  },
  preview: {
    height: 350,
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  galleryButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Results styles
  resultsContainer: {
    flex: 1,
  },
  resultHeader: {
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  // Heatmap styles
  heatmapSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heatmapImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  heatmapHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // NPK Section
  npkSection: {
    marginBottom: 16,
  },
  nutrientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nutrientLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    width: 45,
    textAlign: 'right',
  },
  confidenceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  recText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    lineHeight: 18,
  },
  newScanButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  newScanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
