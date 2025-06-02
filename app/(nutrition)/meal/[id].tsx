import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MealEditModal from '../../components/MealEditModal';
import { format } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                          */
/* ------------------------------------------------------------------ */
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_HEIGHT = SCREEN_WIDTH * (16 / 9); // 9-by-16 portrait canvas
const LOGO_SRC = Image.resolveAssetSource(
  require('../../../assets/images/BallerAILogo.png')
).uri; // ensure ViewShot picks it up

/* ------------------------------------------------------------------ */
/*  SHARE-CARD (Macro stamp)                                           */
/* ------------------------------------------------------------------ */
function MacroStamp({ meal, visible }: { meal: any; visible: boolean }) {
  if (!visible) return null;

  return (
    <View style={styles.stampContainer} pointerEvents="none">
      {/* Brand */}
      <View style={styles.stampBrandRow}>
        <Image source={{ uri: LOGO_SRC }} style={styles.stampLogo} />
        <Text style={styles.stampBrandTxt}>BallerAI</Text>
      </View>

      {/* Meal name */}
      <Text style={styles.stampMealName} numberOfLines={2}>
        {meal.combinedName || meal.items?.[0]?.name || 'Meal'}
      </Text>

      {/* Macro grid */}
      <View style={styles.stampMacros}>
        {[
          { icon: '🔥', label: `${meal.totalMacros?.calories || 0}` },
          { icon: '🥩', label: `${meal.totalMacros?.protein || 0}g` },
          { icon: '🌾', label: `${meal.totalMacros?.carbs || 0}g` },
          { icon: '🧈', label: `${meal.totalMacros?.fats || 0}g` },
        ].map((m, i) => (
          <View key={i} style={styles.stampMacroItem}>
            <Text style={styles.stampMacroIcon}>{m.icon}</Text>
            <Text style={styles.stampMacroVal}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                     */
/* ------------------------------------------------------------------ */
export default function MealDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);

  const [meal, setMeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  /* ------------------ fetch meal once ------------------ */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'meals', id));
        if (!snap.exists()) throw new Error('not found');
        setMeal({ id: snap.id, ...snap.data() });
      } catch {
        Alert.alert('Error', 'Meal not found');
        router.push('/(tabs)/nutrition');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ------------------ helpers -------------------------- */
  const captureAsync = async () => {
    const uri = await viewShotRef.current?.capture?.();
    if (!uri) throw new Error('capture-failed');
    return uri;
  };

  const shareAsync = async (uri: string) => {
    const msg =
      `Logged ${meal.combinedName || meal.items?.[0]?.name || 'a meal'} on BallerAI – ` +
      `${meal.totalMacros?.calories || 0} kcal · ${meal.totalMacros?.protein || 0} P · ` +
      `${meal.totalMacros?.carbs || 0} C · ${meal.totalMacros?.fats || 0} F`;
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: msg });
  };

  /* ------------------ actions -------------------------- */
  const handleShare = async () => {
    try {
      setExporting(true);
      const uri = await captureAsync();
      await shareAsync(uri);
    } catch {
      Alert.alert('Error', 'Unable to share image');
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setExporting(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') throw new Error();
      const uri = await captureAsync();
      await MediaLibrary.createAssetAsync(uri);
      Alert.alert('Saved', 'Image saved to Photos 📸', [
        { text: 'OK' },
        { text: 'Share', onPress: () => shareAsync(uri) },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setSaving(false);
      setExporting(false);
    }
  };

  /* ------------------ render --------------------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4064F6" />
      </View>
    );
  }
  if (!meal) return null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* ---------- story canvas (captured) ---------- */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={{ width: SCREEN_WIDTH, height: STORY_HEIGHT }}
        >
          <View style={styles.canvas}>
            {/* overlay buttons (not captured) */}
            {!exporting && (
              <View style={styles.topBar}>
                <TouchableOpacity style={styles.barBtn} onPress={router.back}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity style={[styles.barBtn, { marginRight: 8 }]} onPress={handleSave}>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.barBtn} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* meal image */}
            {meal.photoUri ? (
              <Image source={{ uri: meal.photoUri }} style={styles.img} resizeMode="cover" />
            ) : (
              <View style={styles.noImg}>
                <Ionicons name="image-outline" size={48} color="#999" />
                <Text style={{ marginTop: 8, fontWeight: '600', color: '#999' }}>No photo</Text>
              </View>
            )}

            {/* share-card */}
            <MacroStamp meal={meal} visible={exporting} />
          </View>
        </ViewShot>

        {/* ---------- details card ---------- */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.editFab} onPress={() => setShowEdit(true)}>
            <Ionicons name="create-outline" size={22} color="#4064F6" />
          </TouchableOpacity>

          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{format(new Date(meal.timestamp), 'MMM d, yyyy • h:mm a')}</Text>
          </View>

          <Text style={styles.title}>{meal.combinedName || meal.items?.[0]?.name || 'Meal'}</Text>

          {/* Items */}
          {!!meal.items?.length && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Items</Text>
              {meal.items.map((it: any, i: number) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  <Text style={styles.itemPortion}>{it.portion}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Nutrition */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Nutrition Facts</Text>
            <View style={styles.calRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flame-outline" size={20} color="#4064F6" style={{ marginRight: 6 }} />
                <Text style={styles.calLabel}>Calories</Text>
              </View>
              <Text style={styles.calVal}>{meal.totalMacros?.calories || 0}</Text>
            </View>

            <View style={styles.macroGrid}>
              {[
                { icon: '🥩', name: 'Protein', val: `${meal.totalMacros?.protein || 0}g` },
                { icon: '🌾', name: 'Carbs', val: `${meal.totalMacros?.carbs || 0}g` },
                { icon: '🧈', name: 'Fats', val: `${meal.totalMacros?.fats || 0}g` },
              ].map((m, i) => (
                <View key={i} style={styles.macroCard}>
                  <Text style={styles.macroIcon}>{m.icon}</Text>
                  <Text style={styles.macroVal}>{m.val}</Text>
                  <Text style={styles.macroName}>{m.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* overlay while saving */}
      {saving && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* edit modal */}
      <MealEditModal
        visible={showEdit}
        meal={meal}
        onClose={() => setShowEdit(false)}
        onSave={async (m) => {
          await updateDoc(doc(db, 'meals', m.id), {
            items: m.items,
            totalMacros: m.totalMacros,
            combinedName: m.combinedName,
            updatedAt: new Date().toISOString(),
          });
          setMeal(m);
          setShowEdit(false);
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  STYLES                                                             */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* canvas / story */
  canvas: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20 },

  img: { width: '100%', height: '100%' },
  noImg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' },

  /* floating share-card */
  stampContainer: {
    position: 'absolute',
    bottom: 32,
    left: '5%',
    right: '5%',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  stampBrandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stampLogo: { width: 20, height: 20, resizeMode: 'contain', marginRight: 6 },
  stampBrandTxt: { fontSize: 16, fontWeight: '700', color: '#4064F6' },
  stampMealName: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 14 },
  stampMacros: { flexDirection: 'row', justifyContent: 'space-between' },
  stampMacroItem: { flex: 1, alignItems: 'center' },
  stampMacroIcon: { fontSize: 22, marginBottom: 4 },
  stampMacroVal: { fontSize: 14, fontWeight: '600' },

  /* details card */
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  editFab: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeTxt: { fontSize: 12, color: '#666' },
  title: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 24 },

  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemName: { fontSize: 14, flex: 1, color: '#333' },
  itemPortion: { fontSize: 14, color: '#666' },

  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  calLabel: { fontSize: 18, fontWeight: '600' },
  calVal: { fontSize: 24, fontWeight: '700', color: '#4064F6' },

  macroGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  macroCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  macroIcon: { fontSize: 24, marginBottom: 8 },
  macroVal: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  macroName: { fontSize: 12, color: '#666' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});