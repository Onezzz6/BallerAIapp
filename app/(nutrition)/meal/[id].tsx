/* --------------------------------------------------------------------------
   Meal-details screen with custom share shortcuts
   -------------------------------------------------------------------------- */
   import React, { useEffect, useRef, useState } from 'react';
   import {
     ActivityIndicator,
     Alert,
     Dimensions,
     Image,
     Linking,
     Modal,
     Platform,
     ScrollView,
     Share,
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
   import * as Clipboard from 'expo-clipboard';
   import { doc, getDoc, updateDoc } from 'firebase/firestore';
   import { db } from '../../../config/firebase';
   import MealEditModal from '../../components/MealEditModal';
   import { format } from 'date-fns';
   
   /* ------------------------------------------------------------------ */
   /* CONSTANTS                                                           */
   /* ------------------------------------------------------------------ */
   const { width: SCREEN_WIDTH } = Dimensions.get('window');
   const STORY_HEIGHT = SCREEN_WIDTH * (16 / 9);
   const LOGO_URI = Image.resolveAssetSource(
     require('../../../assets/images/BallerAILogo.png')
   ).uri;
   
   /* ------------------------------------------------------------------ */
   /* SHARE-CARD COMPONENT (captured)                                     */
   /* ------------------------------------------------------------------ */
   const MacroStamp = ({ meal, visible }: { meal: any; visible: boolean }) =>
     !visible ? null : (
       <View style={styles.stamp}>
         {/* Brand logo + name */}
         <View style={styles.stampBrandRow}>
           <Image source={{ uri: LOGO_URI }} style={styles.stampLogo} />
           <Text style={styles.stampBrand}>BallerAI</Text>
         </View>
   
         {/* Meal name */}
         <Text style={styles.stampMealName} numberOfLines={2}>
           {meal.combinedName || meal.items?.[0]?.name || 'Meal'}
         </Text>
   
         {/* Macros row */}
         <View style={styles.stampMacros}>
           {[
             { icon: '🔥', val: `${meal.totalMacros?.calories || 0}` },
             { icon: '🥩', val: `${meal.totalMacros?.protein || 0}g` },
             { icon: '🌾', val: `${meal.totalMacros?.carbs || 0}g` },
             { icon: '🧈', val: `${meal.totalMacros?.fats || 0}g` },
           ].map((m, i) => (
             <View key={i} style={styles.stampMacroCol}>
               <Text style={styles.stampMacroIcon}>{m.icon}</Text>
               <Text style={styles.stampMacroVal}>{m.val}</Text>
             </View>
           ))}
         </View>
       </View>
     );
   
   /* ------------------------------------------------------------------ */
   /* MAIN COMPONENT                                                      */
   /* ------------------------------------------------------------------ */
   export default function MealDetailsScreen() {
     const { id } = useLocalSearchParams<{ id: string }>();
     const router = useRouter();
     const viewShot = useRef<ViewShot>(null);
   
     const [meal, setMeal] = useState<any>(null);
     const [loading, setLoading] = useState(true);
   
     /* share modal state */
     const [shareURI, setShareURI] = useState<string | null>(null);
     const [shareVisible, setShareVisible] = useState(false);
     const [capturing, setCapturing] = useState(false);
     const [stampVisible, setStampVisible] = useState(false);
   
     /* edit modal */
     const [editOpen, setEditOpen] = useState(false);
   
     /* fetch meal from Firestore */
     useEffect(() => {
       (async () => {
         try {
           const snap = await getDoc(doc(db, 'meals', id));
           if (!snap.exists()) throw new Error();
           setMeal({ id: snap.id, ...snap.data() });
         } catch {
           Alert.alert('Error', 'Meal not found');
           router.push('/(tabs)/nutrition');
         } finally {
           setLoading(false);
         }
       })();
     }, [id]);
   
     /* -------------------------------------------------- */
     /*  helpers                                           */
     /* -------------------------------------------------- */
     const captureImage = async (): Promise<string> => {
       const uri = await viewShot.current?.capture?.();
       if (!uri) throw new Error('capture-failed');
       return uri;
     };
   
     const downloadImage = async () => {
       try {
         const { status } = await MediaLibrary.requestPermissionsAsync();
         if (status !== 'granted') {
           Alert.alert('Permission needed', 'Please grant permission to save images');
           return;
         }
         setCapturing(true);
         setStampVisible(true);
         
         // Wait for stamp to render
         await new Promise(resolve => setTimeout(resolve, 200));
         
         const uri = await captureImage();
         await MediaLibrary.createAssetAsync(uri);
         Alert.alert('Saved', 'Image saved to your Photos');
         
         setStampVisible(false);
       } catch {
         Alert.alert('Error', 'Failed to save image');
         setStampVisible(false);
       } finally {
         setCapturing(false);
       }
     };
   
     const openShareModal = async () => {
       try {
         setCapturing(true);
         setStampVisible(true);
         
         // Wait for stamp to render
         await new Promise(resolve => setTimeout(resolve, 200));
         
         const uri = await captureImage();
         setShareURI(uri);
         setStampVisible(false);
         setShareVisible(true);
       } catch {
         Alert.alert('Error', 'Could not prepare share image');
         setStampVisible(false);
       } finally {
         setCapturing(false);
       }
     };
   
     /* ---------- quick-share helpers ---------- */
     const shareToInstagram = async () => {
       if (!shareURI) return;
       
       try {
         // Use the regular sharing approach which works better with Instagram
         await Sharing.shareAsync(shareURI, {
           mimeType: 'image/png',
           dialogTitle: 'Share to Instagram'
         });
       } catch (error) {
         console.log('Instagram sharing error:', error);
         Alert.alert('Error', 'Could not share to Instagram');
       }
       setShareVisible(false);
     };
   
     const shareToMessages = async () => {
       if (!shareURI) return;
       
       try {
         if (Platform.OS === 'ios') {
           // Use the native Share API which should prioritize Messages
           await Share.share(
             { 
               url: shareURI,
               message: `Check out my meal tracked with BallerAI! 🔥`
             },
             {
               subject: 'My BallerAI Meal',
               // Remove most apps to prioritize Messages
               excludedActivityTypes: [
                 'com.apple.UIKit.activity.PostToFacebook',
                 'com.apple.UIKit.activity.PostToTwitter',
                 'com.apple.UIKit.activity.Mail',
                 'com.apple.UIKit.activity.Print',
                 'com.apple.UIKit.activity.SaveToCameraRoll',
                 'com.apple.UIKit.activity.AssignToContact',
               ]
             }
           );
         } else {
           // Android - use Sharing with messaging preference
           await Sharing.shareAsync(shareURI, {
             mimeType: 'image/png',
             dialogTitle: 'Share via Messages'
           });
         }
       } catch (error) {
         console.log('Messages sharing error:', error);
         await Sharing.shareAsync(shareURI);
       }
       setShareVisible(false);
     };
   
     const shareOther = async () => {
       if (!shareURI) return;
       await Sharing.shareAsync(shareURI);
       setShareVisible(false);
     };
   
     /* ---------- loading state ---------- */
     if (loading) {
       return (
         <View style={styles.center}>
           <ActivityIndicator size="large" color="#4064F6" />
         </View>
       );
     }
     if (!meal) return null;
   
     /* -------------------------------------------------- */
     /*  render                                            */
     /* -------------------------------------------------- */
     return (
       <View style={styles.root}>
         <Stack.Screen options={{ headerShown: false }} />
   
         {/* Check if meal has a photo URL */}
         {meal.photoUri ? (
           // LAYOUT WITH PHOTO - Existing layout
           <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
             {/* ================ IMAGE CANVAS (9:16) ================= */}
             <ViewShot
               ref={viewShot}
               style={{ width: SCREEN_WIDTH, height: STORY_HEIGHT }}
               options={{ format: 'png', quality: 1 }}
             >
               <Image
                 source={{ uri: meal.photoUri }}
                 style={styles.img}
                 resizeMode="cover"
               />
   
               {/* Top buttons: back, download, share */}
               {!stampVisible && (
                 <View style={styles.topOverlay}>
                   <TouchableOpacity
                     style={styles.topButton}
                     onPress={() => router.push('/(tabs)/nutrition')}
                     disabled={capturing}
                   >
                     <Ionicons name="chevron-back" size={24} color="#fff" />
                   </TouchableOpacity>
                   <View style={{ flexDirection: 'row' }}>
                     <TouchableOpacity
                       style={styles.topButton}
                       onPress={downloadImage}
                       disabled={capturing}
                     >
                       <Ionicons name="download-outline" size={22} color="#fff" />
                     </TouchableOpacity>
                     <TouchableOpacity
                       style={styles.topButton}
                       onPress={openShareModal}
                       disabled={capturing}
                     >
                       <Ionicons name="share-outline" size={22} color="#fff" />
                     </TouchableOpacity>
                   </View>
                 </View>
               )}
   
               {/* Footer: display only when capturing */}
               <MacroStamp meal={meal} visible={stampVisible} />
             </ViewShot>
   
             {/* ================ DETAILS CARD ================= */}
             <View style={styles.card}>
               {/* Edit FAB */}
               <TouchableOpacity
                 style={styles.editFab}
                 onPress={() => setEditOpen(true)}
               >
                 <Ionicons name="create-outline" size={22} color="#4064F6" />
               </TouchableOpacity>
   
               {/* Date badge */}
               <View style={styles.dateBadge}>
                 <Text style={styles.dateTxt}>
                   {format(new Date(meal.timestamp), 'MMM d, yyyy • h:mm a')}
                 </Text>
               </View>
   
               {/* Meal title */}
               <Text style={styles.title}>
                 {meal.combinedName || meal.items?.[0]?.name || 'Meal'}
               </Text>
   
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
   
               {/* Nutrition Facts */}
               <View style={styles.section}>
                 <Text style={styles.sectionLabel}>Nutrition Facts</Text>
                 <View style={styles.calRow}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Ionicons
                       name="flame-outline"
                       size={20}
                       color="#4064F6"
                       style={{ marginRight: 6 }}
                     />
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
         ) : (
           // LAYOUT WITHOUT PHOTO - Nutrition details only
           <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
             {/* Header with back button only */}
             <View style={styles.noPhotoHeader}>
               <TouchableOpacity
                 style={styles.noPhotoBackButton}
                 onPress={() => router.push('/(tabs)/nutrition')}
               >
                 <Ionicons name="chevron-back" size={24} color="#000" />
               </TouchableOpacity>
               <Text style={styles.noPhotoHeaderTitle}>Meal Details</Text>
               <View style={{ width: 40 }} />
             </View>
   
             {/* ================ NUTRITION DETAILS CARD (Full Screen) ================= */}
             <View style={styles.noPhotoCard}>
               {/* Edit FAB */}
               <TouchableOpacity
                 style={styles.editFab}
                 onPress={() => setEditOpen(true)}
               >
                 <Ionicons name="create-outline" size={22} color="#4064F6" />
               </TouchableOpacity>
   
               {/* Date badge */}
               <View style={styles.dateBadge}>
                 <Text style={styles.dateTxt}>
                   {format(new Date(meal.timestamp), 'MMM d, yyyy • h:mm a')}
                 </Text>
               </View>
   
               {/* Meal title */}
               <Text style={styles.title}>
                 {meal.combinedName || meal.items?.[0]?.name || 'Meal'}
               </Text>
   
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
   
               {/* Nutrition Facts */}
               <View style={styles.section}>
                 <Text style={styles.sectionLabel}>Nutrition Facts</Text>
                 <View style={styles.calRow}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Ionicons
                       name="flame-outline"
                       size={20}
                       color="#4064F6"
                       style={{ marginRight: 6 }}
                     />
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
         )}
   
         {/* ================ SHARE MODAL (Only show if meal has photo) ================= */}
         {meal.photoUri && (
           <Modal
             transparent
             visible={shareVisible}
             animationType="slide"
             onRequestClose={() => setShareVisible(false)}
           >
             <View style={styles.modalBackdrop}>
               <View style={styles.shareModalContainer}>
                 
                 {/* Header */}
                 <View style={styles.shareModalHeader}>
                   <TouchableOpacity
                     onPress={() => setShareVisible(false)}
                     style={styles.closeButton}
                   >
                     <Ionicons name="close" size={24} color="#666" />
                   </TouchableOpacity>
                   <Text style={styles.shareModalTitle}>Share</Text>
                   <View style={styles.headerSpacer} />
                 </View>

                 {/* Preview Image */}
                 {shareURI && (
                   <View style={styles.previewContainer}>
                     <Image 
                       source={{ uri: shareURI }} 
                       style={styles.previewImage}
                       resizeMode="contain"
                     />
                   </View>
                 )}

                 {/* Share Options */}
                 <View style={styles.shareOptionsContainer}>
                   <TouchableOpacity
                     style={styles.shareOptionButton}
                     onPress={shareOther}
                   >
                     <View style={[styles.shareOptionIcon, styles.shareButton]}>
                       <Ionicons
                         name="share-outline"
                         size={28}
                         color="#fff"
                       />
                     </View>
                     <Text style={styles.shareOptionText}>Share</Text>
                   </TouchableOpacity>

                   <TouchableOpacity
                     style={styles.shareOptionButton}
                     onPress={() => {
                       if (shareURI) {
                         Clipboard.setStringAsync(shareURI);
                         Alert.alert('Copied', 'Image copied to clipboard');
                       }
                       setShareVisible(false);
                     }}
                   >
                     <View style={[styles.shareOptionIcon, styles.copyButton]}>
                       <Ionicons name="copy-outline" size={28} color="#fff" />
                     </View>
                     <Text style={styles.shareOptionText}>Copy</Text>
                   </TouchableOpacity>

                   <TouchableOpacity
                     style={styles.shareOptionButton}
                     onPress={async () => {
                       try {
                         const { status } = await MediaLibrary.requestPermissionsAsync();
                         if (status !== 'granted') {
                           Alert.alert('Permission needed', 'Please grant permission to save images');
                           return;
                         }
                         if (shareURI) {
                           await MediaLibrary.createAssetAsync(shareURI);
                           Alert.alert('Saved', 'Image saved to your Photos');
                         }
                       } catch {
                         Alert.alert('Error', 'Failed to save image');
                       }
                       setShareVisible(false);
                     }}
                   >
                     <View style={[styles.shareOptionIcon, styles.downloadButton]}>
                       <Ionicons name="download-outline" size={28} color="#fff" />
                     </View>
                     <Text style={styles.shareOptionText}>Download</Text>
                   </TouchableOpacity>
                 </View>
               </View>
             </View>
           </Modal>
         )}
   
         {/* ================ EDIT MODAL ================= */}
         <MealEditModal
           visible={editOpen}
           meal={meal}
           onClose={() => setEditOpen(false)}
           onSave={async (m: any) => {
             // Filter out undefined values and provide defaults
             const updateData: any = {
               updatedAt: new Date().toISOString(),
             };
             
             if (m.items !== undefined) {
               updateData.items = m.items;
             }
             
             if (m.totalMacros !== undefined) {
               updateData.totalMacros = m.totalMacros;
             }
             
             if (m.combinedName !== undefined) {
               updateData.combinedName = m.combinedName;
             }
             
             await updateDoc(doc(db, 'meals', m.id), updateData);
             setMeal(m);
             setEditOpen(false);
           }}
         />
       </View>
     );
   }
   
   /* ------------------------------------------------------------------ */
   /* STYLES                                                              */
   /* ------------------------------------------------------------------ */
   const styles = StyleSheet.create({
     root: { flex: 1, backgroundColor: '#F5F5F5' },
     center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   
     /* IMAGE CANVAS */
     img: { width: '100%', height: '100%' },
     topOverlay: {
       position: 'absolute',
       top: 0,
       left: 0,
       right: 0,
       flexDirection: 'row',
       justifyContent: 'space-between',
       paddingHorizontal: 16,
       paddingTop: 60,
       zIndex: 2,
     },
     topButton: {
       marginHorizontal: 8,
       padding: 8,
       backgroundColor: 'rgba(0,0,0,0.5)',
       borderRadius: 20,
     },
   
     /* share card */
     stamp: {
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
       elevation: 7,
     },
     stampBrandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
     stampLogo: { width: 20, height: 20, marginRight: 6, resizeMode: 'contain' },
     stampBrand: { fontSize: 16, fontWeight: '700', color: '#4064F6' },
     stampMealName: { fontSize: 14, fontWeight: '600', marginBottom: 14 },
     stampMacros: { flexDirection: 'row', justifyContent: 'space-between' },
     stampMacroCol: { flex: 1, alignItems: 'center' },
     stampMacroIcon: { fontSize: 22, marginBottom: 2 },
     stampMacroVal: { fontSize: 14, fontWeight: '600' },
   
     /* DETAILS CARD */
     card: {
       backgroundColor: '#fff',
       borderTopLeftRadius: 20,
       borderTopRightRadius: 20,
       marginTop: -20,
       padding: 24,
       paddingBottom: 48,
     },
     editFab: {
       position: 'absolute',
       top: 24,
       right: 24,
       width: 40,
       height: 40,
       borderRadius: 20,
       backgroundColor: '#F0F0F0',
       alignItems: 'center',
       justifyContent: 'center',
     },
     dateBadge: {
       alignSelf: 'flex-start',
       backgroundColor: '#F0F0F0',
       borderRadius: 14,
       paddingHorizontal: 10,
       paddingVertical: 4,
       marginBottom: 16,
     },
     dateTxt: { fontSize: 12, color: '#666' },
     title: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
   
     section: { marginBottom: 24 },
     sectionLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
   
     itemRow: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       paddingVertical: 8,
       borderBottomWidth: 1,
       borderBottomColor: '#F0F0F0',
     },
     itemName: { fontSize: 14, flex: 1 },
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
   
     /* SHARE MODAL */
     modalBackdrop: { 
       flex: 1, 
       backgroundColor: 'rgba(0,0,0,0.4)',
       justifyContent: 'flex-end',
     },
     shareModalContainer: {
       backgroundColor: '#fff',
       borderTopLeftRadius: 20,
       borderTopRightRadius: 20,
       height: '85%',
     },
     shareModalHeader: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       padding: 16,
       borderBottomWidth: 1,
       borderBottomColor: '#f0f0f0',
     },
     closeButton: {
       padding: 8,
     },
     shareModalTitle: {
       fontSize: 18,
       fontWeight: '700',
       color: '#000',
     },
     headerSpacer: { 
       width: 40, // Same width as close button for centering
     },
     previewContainer: {
       flex: 1,
       margin: 8,
       marginTop: 4,
       marginBottom: 4,
       borderRadius: 20,
       overflow: 'hidden',
       backgroundColor: '#fff',
       maxHeight: '80%',
       justifyContent: 'center',
     },
     previewImage: {
       width: '100%',
       height: '100%',
       resizeMode: 'contain',
     },
     previewStamp: {
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
       elevation: 7,
     },
     previewStampBrand: {
       flexDirection: 'row',
       alignItems: 'center',
       marginBottom: 8,
     },
     previewStampLogo: { 
       width: 20, 
       height: 20, 
       marginRight: 6, 
       resizeMode: 'contain' 
     },
     previewStampBrandText: { 
       fontSize: 16, 
       fontWeight: '700', 
       color: '#4064F6' 
     },
     previewStampMealName: { 
       fontSize: 14, 
       fontWeight: '600', 
       marginBottom: 14,
       color: '#000',
     },
     previewStampMacros: { 
       flexDirection: 'row', 
       justifyContent: 'space-between',
     },
     previewStampMacroCol: { 
       flex: 1, 
       alignItems: 'center',
     },
     previewStampMacroIcon: { 
       fontSize: 22, 
       marginBottom: 2,
     },
     previewStampMacroVal: { 
       fontSize: 14, 
       fontWeight: '600',
       color: '#000',
     },
     previewStampMacroLabel: { 
       fontSize: 12, 
       color: '#666',
       textAlign: 'center',
     },
     shareOptionsContainer: {
       flexDirection: 'row',
       justifyContent: 'space-around',
       paddingVertical: 24,
       paddingHorizontal: 16,
       backgroundColor: '#f8f9fa',
       borderBottomLeftRadius: 20,
       borderBottomRightRadius: 20,
     },
     shareOptionButton: {
       alignItems: 'center',
       padding: 8,
     },
     shareOptionIcon: {
       width: 60,
       height: 60,
       borderRadius: 30,
       backgroundColor: '#fff',
       alignItems: 'center',
       justifyContent: 'center',
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.1,
       shadowRadius: 4,
       elevation: 2,
     },
     shareOptionText: { 
       marginTop: 8, 
       fontSize: 12, 
       fontWeight: '600',
       color: '#000',
     },
     shareButton: {
       backgroundColor: '#007AFF',
     },
     copyButton: {
       backgroundColor: '#8E8E93',
     },
     downloadButton: {
       backgroundColor: '#34C759',
     },
     noPhotoHeader: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       padding: 16,
       paddingTop: 60, // Account for status bar
       backgroundColor: '#fff',
     },
     noPhotoBackButton: {
       padding: 8,
       borderRadius: 20,
       backgroundColor: '#F0F0F0',
     },
     noPhotoHeaderTitle: {
       fontSize: 18,
       fontWeight: '700',
       color: '#000',
     },
     noPhotoCard: {
       backgroundColor: '#fff',
       flex: 1,
       padding: 24,
       paddingBottom: 48,
     },
   });