/**
 * Camera Screen
 * ==============
 * Camera capture and gallery selection for leaf photos
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { uploadScan } from '../api';
import { AnalysisLoadingOverlay, Button } from '../components';
import { t } from '../i18n';
import { borderRadius, colors, spacing } from '../theme';

const CameraScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cropId = route.params?.cropId || 1;

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        // Resize and compress image
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setCapturedImage(manipulated.uri);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert(t('error'), 'Failed to capture photo');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Resize and compress image
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setCapturedImage(manipulated.uri);
      }
    } catch (error) {
      console.error('Gallery picker error:', error);
      Alert.alert(t('error'), 'Failed to select photo');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUsePhoto = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);

    try {
      const result = await uploadScan(capturedImage, cropId);
      
      // Navigate to results screen
      navigation.replace('Results', { scanResult: result });
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        t('error'),
        error.response?.data?.error || t('uploadError'),
        [
          { text: t('retry'), onPress: handleUsePhoto },
          { text: t('cancel'), style: 'cancel' },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Permission not granted
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.permissionText}>{t('cameraPermissionError')}</Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            style={{ marginTop: spacing.lg }}
          />
          <Button
            title={t('chooseFromGallery')}
            onPress={handlePickFromGallery}
            variant="outline"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Show captured image preview
  if (capturedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <AnalysisLoadingOverlay visible={isProcessing} />
        
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={32} color={colors.textWhite} />
        </TouchableOpacity>

        {/* Image Preview */}
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        </View>

        {/* Action buttons */}
        <View style={styles.previewActions}>
          <Button
            title={t('retake')}
            onPress={handleRetake}
            variant="outline"
            icon={<Ionicons name="refresh" size={20} color={colors.primary} />}
            style={styles.actionButton}
          />
          <Button
            title={t('usePhoto')}
            onPress={handleUsePhoto}
            icon={<Ionicons name="checkmark" size={20} color={colors.textWhite} />}
            style={styles.actionButton}
            loading={isProcessing}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={32} color={colors.textWhite} />
      </TouchableOpacity>

      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Guide overlay */}
        <View style={styles.overlay}>
          <View style={styles.guideFrame}>
            <Text style={styles.guideText}>{t('cameraGuide')}</Text>
          </View>
        </View>
      </CameraView>

      {/* Camera controls */}
      <View style={styles.controls}>
        {/* Gallery button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePickFromGallery}
        >
          <Ionicons name="images" size={28} color={colors.textWhite} />
        </TouchableOpacity>

        {/* Capture button */}
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureInner} />
        </TouchableOpacity>

        {/* Flip camera button */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
        >
          <Ionicons name="camera-reverse" size={28} color={colors.textWhite} />
        </TouchableOpacity>
      </View>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <View style={styles.tutorialOverlay}>
            <TouchableOpacity 
                style={styles.tutorialClose}
                onPress={() => setShowTutorial(false)}
            >
                <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.tutorialCard}>
                <View style={styles.tutorialIllustration}>
                    <Ionicons name="scan-outline" size={64} color={colors.primary} />
                    <View style={{ position: 'absolute', bottom: 35, right: 35, backgroundColor: colors.primary, borderRadius: 12, padding: 2 }}>
                         <Ionicons name="leaf" size={20} color="#FFF" />
                    </View>
                </View>
                
                <Text style={styles.tutorialTitle}>{t('tutorialTitle')}</Text>
                <Text style={styles.tutorialText}>
                    {t('tutorialText')}
                </Text>

                <TouchableOpacity 
                    style={styles.startScanButton}
                    onPress={() => setShowTutorial(false)}
                >
                    <Text style={styles.startScanText}>{t('startScan')}</Text>
                </TouchableOpacity>
            </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  permissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  guideCorners: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderColor: colors.primary,
    borderWidth: 4,
    borderRadius: borderRadius.lg,
    // Note: React Native doesn't support partial borders easily like CSS 'border-top-left'. 
    // We would typically use 4 absolute Views for corners. 
    // For simplicity, we'll keep the full dashed frame and maybe a center reticle without corners for now, 
    // or just the dashed frame which is clean.
    opacity: 0, // Hidden for now, adhering to simpler guide
  },
  guideText: {
    color: colors.textWhite,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: 160, // Push text below the center
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.textWhite,
  },
  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.textWhite,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  actionButton: {
    flex: 1,
  },
  // Tutorial Styles
  tutorialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  tutorialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tutorialIllustration: {
    width: 140,
    height: 140,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4', // Very light green bg
    borderRadius: 70,
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tutorialText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
    maxWidth: '90%',
  },
  startScanButton: {
    backgroundColor: colors.textPrimary, // Black/Dark button as per design
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  startScanText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tutorialClose: {
     position: 'absolute',
     top: 60,
     left: 20,
     padding: 8,
     backgroundColor: 'rgba(255,255,255,0.2)',
     borderRadius: 20,
  }
});

export default CameraScreen;
