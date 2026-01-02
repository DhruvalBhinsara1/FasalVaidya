/**
 * Camera Screen
 * ==============
 * Camera capture and gallery selection for leaf photos
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius } from '../theme';
import { Button, LoadingIndicator } from '../components';
import { t } from '../i18n';
import { uploadScan, ScanResult } from '../api';

const CameraScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const cropId = route.params?.cropId || 1;

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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
        <LoadingIndicator visible={isProcessing} message={t('analyzing')} />
        
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
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  guideText: {
    color: colors.textWhite,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.textWhite,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.textWhite,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '90%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  actionButton: {
    flex: 1,
  },
});

export default CameraScreen;
