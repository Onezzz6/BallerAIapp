import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, StatusBar, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface FoodCameraProps {
  visible: boolean;
  onPhotoTaken: (uri: string) => void;
  onClose: () => void;
}

export default function FoodCamera({ visible, onPhotoTaken, onClose }: FoodCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [scanMethod, setScanMethod] = useState<'scan' | 'gallery'>('scan');
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  // Reset flash when camera closes
  useEffect(() => {
    if (!visible) {
      setFlashMode('off');
      setScanMethod('scan'); // Reset to default scan method
    }
  }, [visible]);

  const takePicture = async () => {
    if (scanMethod === 'gallery') {
      // Open gallery instead of taking picture
      handleGallerySelect();
      return;
    }

    if (cameraRef.current && !isCapturing) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
          exif: false,
        });
        if (photo?.uri) {
          onPhotoTaken(photo.uri);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleGallerySelect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        onPhotoTaken(result.assets[0].uri);
        onClose(); // Close the camera after selection
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const toggleFlash = () => {
    const newFlashMode = flashMode === 'off' ? 'on' : 'off';
    setFlashMode(newFlashMode);
    console.log('Flash toggled to:', newFlashMode); // Debug log
  };

  const handleClose = () => {
    // Turn off flash when closing
    setFlashMode('off');
    onClose();
  };

  if (!visible) return null;

  const renderCameraContent = () => {
    if (!permission) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera access is required to take photos</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryFallbackButton} onPress={handleGallerySelect}>
            <Text style={styles.galleryFallbackButtonText}>Or Pick from Gallery</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <CameraView 
        style={styles.camera} 
        facing="back"
        flash={flashMode}
        ref={cameraRef}
      >
        {/* Top Controls */}
        <Animated.View 
          style={styles.topControls}
          entering={FadeInDown.duration(400)}
        >
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Camera Viewfinder Frame */}
        <Animated.View 
          style={styles.viewfinderContainer}
          entering={FadeIn.duration(600)}
        >
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </Animated.View>

        {/* Bottom Controls */}
        <Animated.View 
          style={styles.bottomControls}
          entering={FadeInDown.duration(400).delay(200)}
        >
          {/* Scan Method Options */}
          <View style={styles.scanMethodContainer}>
            <TouchableOpacity 
              style={[
                styles.scanMethodButton,
                scanMethod === 'scan' && styles.scanMethodButtonActive
              ]} 
              onPress={() => setScanMethod('scan')}
            >
              <Ionicons 
                name="scan" 
                size={20} 
                color={scanMethod === 'scan' ? "#000000" : "white"} 
              />
              <Text style={[
                styles.scanMethodText,
                scanMethod === 'scan' && styles.scanMethodTextActive
              ]}>
                Scan Food
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.scanMethodButton,
                scanMethod === 'gallery' && styles.scanMethodButtonActive
              ]} 
              onPress={() => setScanMethod('gallery')}
            >
              <Ionicons 
                name="images" 
                size={20} 
                color={scanMethod === 'gallery' ? "#000000" : "white"} 
              />
              <Text style={[
                styles.scanMethodText,
                scanMethod === 'gallery' && styles.scanMethodTextActive
              ]}>
                Gallery
              </Text>
            </TouchableOpacity>
          </View>

          {/* Camera Controls Row */}
          <View style={styles.controlsRow}>
            {/* Flash Toggle */}
            <TouchableOpacity 
              style={[
                styles.flashToggle,
                flashMode === 'on' && styles.flashToggleActive
              ]} 
              onPress={toggleFlash}
            >
              <Ionicons 
                name={flashMode === 'on' ? "flash" : "flash-off"} 
                size={24} 
                color={flashMode === 'on' ? "#000000" : "white"} 
              />
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity 
              style={[styles.captureButton, isCapturing && styles.capturingButton]} 
              onPress={takePicture}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.flashToggle} />
          </View>
        </Animated.View>
      </CameraView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        {renderCameraContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  scanMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  scanMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  scanMethodButtonActive: {
    backgroundColor: 'white',
  },
  scanMethodText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  scanMethodTextActive: {
    color: '#000000',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  flashToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashToggleActive: {
    backgroundColor: 'white',
  },
  captureButton: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  capturingButton: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#4064F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryFallbackButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  galleryFallbackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 