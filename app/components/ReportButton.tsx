import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportMessage } from '../../services/flaggedMessages';

interface ReportButtonProps {
  messageId: string;
  messageContent: string;
  userQuestion: string;
  timestamp: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  messageId,
  messageContent,
  userQuestion,
  timestamp,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const handleReport = async () => {
    try {
      setIsReporting(true);
      
      await reportMessage(messageId, messageContent, userQuestion, timestamp);

      setShowConfirmation(false);
      Alert.alert(
        'Message Reported',
        'Thank you for your feedback. We will review this message and take appropriate action.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error reporting message:', error);
      Alert.alert(
        'Error',
        'Failed to report message. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowConfirmation(true)}
        style={{
          padding: 4,
          marginLeft: 8,
          borderRadius: 4,
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="flag" size={14} color="#FF4444" />
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <View style={{
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#FFE6E6',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Ionicons name="flag" size={24} color="#FF4444" />
              </View>
              
              <Text style={{
                fontSize: 20,
                fontWeight: '600',
                color: '#000000',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                Report Message
              </Text>
              
              <Text style={{
                fontSize: 16,
                color: '#666666',
                textAlign: 'center',
                lineHeight: 22,
              }}>
                Are you sure you want to report this answer as inappropriate or offensive?
              </Text>
            </View>

            {/* Message Preview */}
            <View style={{
              backgroundColor: '#F8F8F8',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              borderLeftWidth: 3,
              borderLeftColor: '#FF4444',
            }}>
              <Text style={{
                fontSize: 14,
                color: '#333333',
                fontStyle: 'italic',
                lineHeight: 18,
              }} numberOfLines={3}>
                "{messageContent}"
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => setShowConfirmation(false)}
                disabled={isReporting}
                style={{
                  flex: 1,
                  backgroundColor: '#F0F0F0',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#666666',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReport}
                disabled={isReporting}
                style={{
                  flex: 1,
                  backgroundColor: '#FF4444',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: isReporting ? 0.7 : 1,
                }}
              >
                {isReporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}>
                    Report
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
