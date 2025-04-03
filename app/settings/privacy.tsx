import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </Pressable>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.privacyText}>
          Privacy Policy for BallerAI{'\n'}
          Effective Date: March 13, 2025{'\n\n'}

          1. Introduction{'\n'}
          BallerAI ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how BallerAI collects, uses, discloses, and safeguards your information when you use our mobile application (the "App"), as well as your rights regarding your data. By using the App, you agree to the collection and use of information in accordance with this Privacy Policy.{'\n\n'}

          2. Information We Collect{'\n'}
          a. Personal Information:{'\n'}
          When you onboard and use the App, we may collect personal information that you voluntarily provide, including:{'\n'}
          • Basic details such as your name, age, gender, height, and weight{'\n'}
          • Football-specific data including your playing level, position, training schedule, and injury history{'\n'}
          • Lifestyle and health data (e.g., sleep habits, nutritional intake, and training environment){'\n'}
          • Photographs of meals (if you opt for our meal analysis feature) for nutritional analysis{'\n\n'}

          b. Usage Information:{'\n'}
          We may collect data about your interaction with the App, including training logs, session feedback, and activity metrics, to enhance and personalize your training experience.{'\n\n'}

          c. Device and Log Information:{'\n'}
          We may automatically collect device-specific information (e.g., device type, operating system, and unique device identifiers) and log data (e.g., IP address, access times, and usage patterns) for security, analytics, and performance improvements.{'\n\n'}

          3. How We Use Your Information{'\n'}
          We use the collected information for various purposes, including:{'\n'}
          • Personalization: To create tailored training programs and adaptive load management based on your profile, training history, and performance data.{'\n'}
          • Injury Prevention and Recovery: To provide guidelines, feedback, and personalized recommendations to minimize injury risks.{'\n'}
          • Nutrition Analysis: To offer personalized nutritional guidance by analyzing meal photos and logged dietary information.{'\n'}
          • Improvement of Services: To analyze usage trends, perform internal research, and improve the overall functionality and user experience of the App.{'\n'}
          • Communication: To contact you with important updates, support messages, or relevant information about the App, subject to your communication preferences.{'\n\n'}

          4. Sharing and Disclosure of Information{'\n'}
          a. With Third Parties:{'\n'}
          We do not sell your personal information. We may share your information with trusted third-party service providers who perform services on our behalf (e.g., cloud hosting, data analytics, image processing). These providers are contractually obligated to protect your data and use it only for the purposes specified by us.{'\n\n'}

          b. Legal Requirements:{'\n'}
          We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).{'\n\n'}

          c. Business Transfers:{'\n'}
          In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction. In such cases, we will notify you via email and/or a prominent notice on our App of any change in ownership or use of your personal information.{'\n\n'}

          5. Data Security{'\n'}
          We implement commercially reasonable security measures to protect your information from unauthorized access, disclosure, alteration, or destruction. However, please note that no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.{'\n\n'}

          6. Data Retention{'\n'}
          We retain your personal information for as long as is necessary to fulfill the purposes outlined in this Privacy Policy unless a longer retention period is required or permitted by law. When your information is no longer needed, we will take reasonable steps to securely delete or anonymize it.{'\n\n'}

          7. Your Rights and Choices{'\n'}
          a. Access and Correction:{'\n'}
          You may request access to or correction of your personal information by contacting us through the contact details provided below.{'\n\n'}

          b. Deletion:{'\n'}
          Subject to applicable laws and regulations, you may request the deletion of your personal information. Please note that we may need to retain certain information for recordkeeping and legal purposes.{'\n\n'}

          c. Opt-Out:{'\n'}
          You can opt out of receiving marketing communications by following the instructions in those communications or by contacting us. Even if you opt out, we may still send you non-promotional messages, such as those about your account or our ongoing business relations.{'\n\n'}

          8. International Data Transfers{'\n'}
          Your information may be transferred to—and maintained on—computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. We take appropriate steps to ensure that your data is treated securely and in accordance with this Privacy Policy when transferred.{'\n\n'}

          9. Children's Privacy{'\n'}
          Our App is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without parental consent, we will take steps to remove that information.{'\n\n'}

          10. Changes to This Privacy Policy{'\n'}
          We may update this Privacy Policy from time to time. When we do, we will revise the "Effective Date" at the top of this Privacy Policy. We encourage you to review this Privacy Policy periodically to stay informed about our information practices.{'\n\n'}

          11. Contact Us{'\n'}
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:{'\n\n'}

          BallerAI Support{'\n'}
          Email: ballerai.official@gmail.com{'\n'}
          Mail: Limingantie 37, 00560 Helsinki, Finland{'\n\n'}

          12. Governing Law{'\n'}
          This Privacy Policy shall be governed by and construed in accordance with the laws of the jurisdiction in which BallerAI operates, without regard to its conflict of law provisions.{'\n\n'}

          Last Updated: March 13, 2025
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },
}); 