import { auth } from '../config/firebase';
import firestore from '@react-native-firebase/firestore';

export interface FlaggedMessage {
  messageId: string;
  messageContent: string;
  userQuestion: string;
  timestamp: string;
  reportedAt: string;
  reportedBy: string;
  userEmail: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

/**
 * Report a message as inappropriate or offensive
 */
export const reportMessage = async (
  messageId: string,
  messageContent: string,
  userQuestion: string,
  timestamp: string
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const flaggedMessage: FlaggedMessage = {
      messageId,
      messageContent,
      userQuestion,
      timestamp,
      reportedAt: new Date().toISOString(),
      reportedBy: currentUser.uid,
      userEmail: currentUser.email || '',
      status: 'pending',
    };

    await firestore().collection('flaggedMessages').add(flaggedMessage);
    
    console.log('Message reported successfully:', messageId);
  } catch (error) {
    console.error('Error reporting message:', error);
    throw error;
  }
};

/**
 * Get all flagged messages for admin review (optional - for future admin panel)
 */
export const getFlaggedMessages = async (status?: string): Promise<FlaggedMessage[]> => {
  try {
    let query = firestore().collection('flaggedMessages').orderBy('reportedAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FlaggedMessage & { id: string }));
  } catch (error) {
    console.error('Error fetching flagged messages:', error);
    throw error;
  }
};

/**
 * Update the status of a flagged message (for admin use)
 */
export const updateFlaggedMessageStatus = async (
  messageId: string, 
  status: 'pending' | 'reviewed' | 'resolved'
): Promise<void> => {
  try {
    await firestore().collection('flaggedMessages').doc(messageId).update({
      status,
      updatedAt: new Date().toISOString(),
    });
    
    console.log('Flagged message status updated:', messageId, status);
  } catch (error) {
    console.error('Error updating flagged message status:', error);
    throw error;
  }
};
