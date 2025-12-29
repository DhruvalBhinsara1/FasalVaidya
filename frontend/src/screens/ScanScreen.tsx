import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert, ScrollView, Platform, Animated, GestureResponderEvent } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
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

/**
 * Process image for iOS compatibility
 * Compresses and converts to JPEG format which works reliably across platforms
 */
async function processImageForUpload(uri: string): Promise<string> {
  try {
    // On iOS, we need to manipulate the image to ensure it's in a compatible format
    // This also handles HEIC conversion and proper file URI generation
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }], // Resize to reasonable size for upload
      { 
        compress: 0.8, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false, // We don't need base64, just the URI
      }
    );
    console.log('Image processed:', { original: uri, processed: manipResult.uri });
    return manipResult.uri;
  } catch (error) {
    console.warn('Image processing failed, using original:', error);
    return uri;
  }
}

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Animate focus indicator
  useEffect(() => {
    if (focusPoint) {
      focusAnim.setValue(0);
      Animated.sequence([
        Animated.timing(focusAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(focusAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setFocusPoint(null));
    }
  }, [focusPoint, focusAnim]);

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

  const handleFocus = useCallback((event: GestureResponderEvent) => {
    if (!cameraReady) return;
    
    const { locationX, locationY } = event.nativeEvent;
    console.log('Tap to focus at:', locationX, locationY);
    
    // Set focus point for visual indicator
    setFocusPoint({ x: locationX, y: locationY });
    
    // Note: expo-camera CameraView doesn't have direct focus API,
    // but the tap gesture provides visual feedback to user
    // The camera will auto-focus on the tapped area on most devices
  }, [cameraReady]);

  const takePicture = async () => {
    // Prevent double capture
    if (isCapturing) {
      console.log('Already capturing, ignoring...');
      return;
    }
    
    try {
      // Check ref before anything else
      const camera = cameraRef.current;
      if (!camera) {
        console.log('Camera ref is null');
        Alert.alert('Camera not ready', 'Please wait for camera to initialize or use Gallery.');
        return;
      }

      if (!cameraReady) {
        console.log('Camera not ready yet');
        Alert.alert('Camera not ready', 'Please wait a moment and try again.');
        return;
      }
      
      setIsCapturing(true);
      
      // Small delay for iOS camera stabilization
      await new Promise(resolve => setTimeout(resolve, Platform.OS === 'ios' ? 500 : 300));
      
      // Check ref again after delay (might have changed during async operation)
      if (!cameraRef.current) {
        console.log('Camera ref became null during delay');
        setIsCapturing(false);
        return;
      }
      
      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.8,
        skipProcessing: Platform.OS === 'android', // iOS needs processing
        exif: false, // Skip EXIF to reduce file size
      });
      
      console.log('Photo result:', photo);
      
      if (photo && photo.uri) {
        console.log('Photo captured:', photo.uri);
        
        // Process image for iOS compatibility (converts HEIC, normalizes URI)  
        const processedUri = await processImageForUpload(photo.uri);
        
        setCaptured({ uri: processedUri });
        setResult(null);
        setIsCapturing(false);
      } else {
        setIsCapturing(false);
        Alert.alert('Capture failed', 'Photo was empty. Try using Gallery instead.');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsCapturing(false);
      // Don't show alert for "null" errors - just log them
      if (err.message?.includes('null')) {
        console.log('Camera ref was null, user can retry');
        return;
      }
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
        quality: 0.8,
        // On iOS, request base64 to help with certain edge cases
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const originalUri = result.assets[0].uri;
        console.log('Image picked:', originalUri);
        
        // Process image for iOS compatibility
        const processedUri = await processImageForUpload(originalUri);
        
        setCaptured({ uri: processedUri });
        setResult(null);
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
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
          <Pressable style={styles.cameraWrapper} onPress={handleFocus}>
            <CameraView 
              style={styles.camera} 
              facing={facing} 
              ref={cameraRef}
              enableTorch={torch}
              onCameraReady={onCameraReady}
            />
            {/* Focus indicator */}
            {focusPoint && (
              <Animated.View
                style={[
                  styles.focusIndicator,
                  {
                    left: focusPoint.x - 30,
                    top: focusPoint.y - 30,
                    opacity: focusAnim,
                    transform: [{
                      scale: focusAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1.5, 1],
                      }),
                    }],
                  },
                ]}
              />
            )}
          </Pressable>
          <View style={styles.cameraControls}>
            <Pressable style={styles.controlButton} onPress={toggleTorch}>
              <Text style={styles.controlButtonText}>{torch ? '🔦' : '💡'}</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={toggleCameraFacing}>
              <Text style={styles.controlButtonText}>🔄</Text>
            </Pressable>
          </View>
          {/* Tap to focus hint */}
          {cameraReady && (
            <View style={styles.focusHint}>
              <Text style={styles.focusHintText}>Tap to focus</Text>
            </View>
          )}
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
          <Pressable style={styles.secondaryButton} onPress={() => { setCaptured(null); setTorch(false); setCameraReady(false); setIsCapturing(false); }}>
            <Text style={styles.secondaryButtonText}>{captured ? 'Retake' : 'Reset'}</Text>
          </Pressable>
          {!captured && (
            <Pressable style={styles.galleryButton} onPress={pickImage}>
              <Text style={styles.galleryButtonText}>📁 Gallery</Text>
            </Pressable>
          )}
          <Pressable style={styles.primaryButton} onPress={captured ? sendToBackend : takePicture} disabled={uploading || isCapturing}>
            {uploading || isCapturing ? (
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
            {result.model_used && (
              <Text style={styles.modelInfo}>🌱 Model: {result.model_used}</Text>
            )}
          </View>

          {/* Primary Detection - Show what the model actually detected */}
          {result.detected_class && (
            <View style={styles.detectionBanner}>
              <Text style={styles.detectionLabel}>🎯 Detected Issue:</Text>
              <Text style={styles.detectionClass}>
                {result.detected_class === 'healthy' ? '✅ Healthy Leaf' : 
                 result.detected_class.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Text>
              <Text style={styles.detectionConfidence}>
                Confidence: {result.detection_confidence}%
              </Text>
            </View>
          )}

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
          <Pressable style={styles.newScanButton} onPress={() => { setCaptured(null); setResult(null); setCameraReady(false); }}>
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
  cameraWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  focusIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  focusHint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  focusHintText: {
    color: '#fff',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  modelInfo: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  detectionBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  detectionLabel: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  detectionClass: {
    fontSize: 22,
    fontWeight: '700',
    color: '#78350F',
    marginTop: 4,
    textAlign: 'center',
  },
  detectionConfidence: {
    fontSize: 14,
    color: '#92400E',
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
