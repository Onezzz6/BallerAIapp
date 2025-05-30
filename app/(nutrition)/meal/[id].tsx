import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import MealEditModal from '../../components/MealEditModal';

// Get screen dimensions for square photo crop
const SCREEN_WIDTH = Dimensions.get('window').width;

// Get screen dimensions for portrait photo (Instagram Story ratio)
const { width: SCREEN_W } = Dimensions.get('window');
const STORY_RATIO = 16 / 9;          // height ÷ width
const STORY_H = Math.round(SCREEN_W * STORY_RATIO);

// Macro stamp component for both display and capture
const MacroStamp = ({ meal, style }: { meal: any; style?: any }) => {
  return (
    <View style={[styles.macroStamp, style]}>
      <View style={styles.macroStampHeader}>
        <Image 
          source={require('../../../assets/images/BallerAILogo.png')}
          style={styles.stampLogo}
        />
        <Text style={styles.stampBrand}>BallerAI</Text>
      </View>
      <Text style={styles.stampMealName} numberOfLines={2}>
        {meal.combinedName || meal.items?.[0]?.name || 'Meal'}
      </Text>
      <View style={styles.stampMacros}>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🔥</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.calories || 0}</Text>
        </View>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🥩</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.protein || 0}g</Text>
        </View>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🌾</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.carbs || 0}g</Text>
        </View>
        <View style={styles.stampMacroItem}>
          <Text style={styles.stampMacroEmoji}>🧈</Text>
          <Text style={styles.stampMacroValue}>{meal.totalMacros?.fats || 0}g</Text>
        </View>
      </View>
    </View>
  );
};

export default function MealDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);
  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadMealDetails();
  }, [id]);

  const loadMealDetails = async () => {
    try {
      const mealDoc = await getDoc(doc(db, 'meals', id as string));
      if (mealDoc.exists()) {
        setMeal({ id: mealDoc.id, ...mealDoc.data() });
      } else {
        Alert.alert('Error', 'Meal not found');
        router.push('/(tabs)/nutrition');
      }
    } catch (error) {
      console.error('Error loading meal:', error);
      Alert.alert('Error', 'Failed to load meal details');
      router.push('/(tabs)/nutrition');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSheet = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Save Image', 'Delete Meal'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleSaveImage();
          } else if (buttonIndex === 2) {
            handleDeleteMeal();
          }
        }
      );
    } else {
      // For Android, use Alert as a simple alternative
      Alert.alert(
        'Options',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Image', onPress: handleSaveImage },
          { text: 'Delete Meal', onPress: handleDeleteMeal, style: 'destructive' },
        ],
        { cancelable: true }
      );
    }
  };

  const handleSaveImage = async () => {
    try {
      setSaving(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save images');
        return;
      }

      // Capture the view
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('Failed to capture image');

      // Save to camera roll
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      Alert.alert('Success', 'Image saved to Photos 📸', [
        { text: 'OK' },
        { text: 'Share', onPress: () => handleShare(uri) }
      ]);
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async (imageUri?: string) => {
    try {
      let uri = imageUri;
      if (!uri) {
        setSaving(true);
        uri = await viewShotRef.current?.capture?.();
        if (!uri) throw new Error('Failed to capture image');
      }

      const shareMessage = `Just logged ${meal.combinedName || meal.items?.[0]?.name || 'a meal'} on BallerAI – ${meal.totalMacros?.calories || 0} kcal • ${meal.totalMacros?.carbs || 0} C • ${meal.totalMacros?.protein || 0} P • ${meal.totalMacros?.fats || 0} F 🔥`;

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: shareMessage,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share image');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeal = () => {
    Alert.alert(
      'Delete this meal?',
      'This will remove the photo and nutrition data from your log.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from Firestore
              await deleteDoc(doc(db, 'meals', id as string));
              
              // Try to delete from Storage if photoUri exists
              if (meal?.photoUri && meal.photoUri.includes('firebase')) {
                try {
                  const storageRef = ref(storage, meal.photoUri);
                  await deleteObject(storageRef);
                } catch (error) {
                  console.log('Storage deletion error (ignoring):', error);
                }
              }
              
              router.push('/(tabs)/nutrition');
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            }
          },
        },
      ]
    );
  };

  const handleSaveMealEdit = async (updatedMeal: any) => {
    try {
      // Update meal in Firestore
      const mealRef = doc(db, 'meals', updatedMeal.id);
      await updateDoc(mealRef, {
        items: updatedMeal.items,
        totalMacros: updatedMeal.totalMacros,
        combinedName: updatedMeal.combinedName,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setMeal(updatedMeal);
      
      setShowEditModal(false);
      Alert.alert('Success', 'Meal updated successfully');
    } catch (error) {
      console.error('Error updating meal:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4064F6" />
      </View>
    );
  }

  if (!meal) return null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
          bounces={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/nutrition')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Meal Details</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Photo Section with ViewShot wrapper for capturing */}
          <ViewShot
            ref={viewShotRef}
            style={{ width: SCREEN_W, height: STORY_H }}
            options={{ 
              format: 'png', 
              quality: 1, 
              result: 'tmpfile',
              width: 1080,             // force 1080×1920 export
              height: 1920,
            }}
          >
            <View style={styles.photoSection}>
              {meal.photoUri ? (
                <Image source={{ uri: meal.photoUri }} style={styles.mealPhoto} />
              ) : (
                <View style={[styles.mealPhoto, styles.photoPlaceholder]}>
                  <Ionicons name="image-outline" size={48} color="#999" />
                  <Text style={styles.noPhotoText}>No photo available</Text>
                </View>
              )}
              
              {/* Gradient overlay for text legibility */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.photoGradient}
                pointerEvents="none"
              />

              {/* Action buttons overlay */}
              <View style={styles.photoOverlay}>
                <TouchableOpacity
                  onPress={() => handleShare()}
                  style={styles.overlayButton}
                >
                  <Ionicons name="share-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleActionSheet}
                  style={styles.overlayButton}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Macro stamp for capture (positioned over photo) */}
              <MacroStamp meal={meal} style={styles.captureStamp} />
            </View>
          </ViewShot>

          {/* Content Card */}
          <View style={styles.contentCard}>
            {/* Edit Button */}
            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={24} color="#4064F6" />
            </TouchableOpacity>

            {/* Date Badge */}
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>
                {format(new Date(meal.timestamp), 'MMM d, yyyy • h:mm a')}
              </Text>
            </View>

            {/* Meal Title */}
            <Text style={styles.mealTitle}>
              {meal.combinedName || meal.items?.[0]?.name || 'Unnamed Meal'}
            </Text>

            {/* Food Items */}
            {meal.items && meal.items.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {meal.items.map((item: any, index: number) => (
                  <View key={index} style={styles.foodItem}>
                    <Text style={styles.foodItemName}>{item.name}</Text>
                    <Text style={styles.foodItemPortion}>{item.portion}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Nutrition Information */}
            <View style={styles.nutritionSection}>
              <Text style={styles.sectionTitle}>Nutrition Facts</Text>
              
              {/* Total Calories */}
              <View style={styles.caloriesRow}>
                <Text style={styles.caloriesLabel}>Calories</Text>
                <Text style={styles.caloriesValue}>{meal.totalMacros?.calories || 0}</Text>
              </View>

              {/* Macros Grid */}
              <View style={styles.macrosGrid}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroEmoji}>🥩</Text>
                  <Text style={styles.macroValue}>{meal.totalMacros?.protein || 0}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroEmoji}>🌾</Text>
                  <Text style={styles.macroValue}>{meal.totalMacros?.carbs || 0}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroEmoji}>🧈</Text>
                  <Text style={styles.macroValue}>{meal.totalMacros?.fats || 0}g</Text>
                  <Text style={styles.macroLabel}>Fats</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Loading overlay */}
        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}

        {/* Meal Edit Modal */}
        <MealEditModal
          visible={showEditModal}
          meal={meal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveMealEdit}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  photoSection: {
    position: 'relative',
    width: '100%',
    height: STORY_H,        // ≈ 9:16 portrait
    backgroundColor: '#000',
  },
  mealPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  photoOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureStamp: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  contentCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    minHeight: 400,
  },
  editButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  dateBadgeText: {
    fontSize: 12,
    color: '#666',
  },
  mealTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
  },
  itemsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  foodItemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  foodItemPortion: {
    fontSize: 14,
    color: '#666',
  },
  nutritionSection: {
    marginTop: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  caloriesLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4064F6',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  macroEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
  },
  macroStamp: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  macroStampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stampLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  stampBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4064F6',
  },
  stampMealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  stampMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stampMacroItem: {
    alignItems: 'center',
  },
  stampMacroEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  stampMacroValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 