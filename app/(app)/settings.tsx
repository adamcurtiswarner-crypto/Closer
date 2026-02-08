import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import { PartnershipSection } from '@/components';

const TIME_OPTIONS = [
  { label: 'Morning (8 AM)', value: '08:00', display: '8:00 AM' },
  { label: 'Afternoon (2 PM)', value: '14:00', display: '2:00 PM' },
  { label: 'Evening (7 PM)', value: '19:00', display: '7:00 PM' },
  { label: 'Night (9 PM)', value: '21:00', display: '9:00 PM' },
];

function getTimeDisplay(value: string): string {
  return TIME_OPTIONS.find((t) => t.value === value)?.display || value;
}

export default function SettingsScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const [remindMe, setRemindMe] = useState(true);
  const [partnerNotify, setPartnerNotify] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);

  const currentTime = user?.notificationTime || '19:00';

  const handleTimeChange = async (newTime: string) => {
    if (!user?.id) return;
    setIsSavingTime(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        notification_time: newTime,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
    } catch (error) {
      logger.error('Error updating notification time:', error);
      Alert.alert('Error', 'Failed to update notification time');
    } finally {
      setIsSavingTime(false);
      setShowTimePicker(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              const userRef = doc(db, 'users', user.id);
              await updateDoc(userRef, {
                is_deleted: true,
                updated_at: serverTimestamp(),
              });
              await signOut();
              router.replace('/(auth)/welcome');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleRemind = async (value: boolean) => {
    setRemindMe(value);
    if (!user?.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        remind_to_respond: value,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      logger.error('Error updating reminder setting:', error);
      setRemindMe(!value); // Revert on error
    }
  };

  const handleTogglePartnerNotify = async (value: boolean) => {
    setPartnerNotify(value);
    if (!user?.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        notify_partner_response: value,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      logger.error('Error updating partner notify setting:', error);
      setPartnerNotify(!value); // Revert on error
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Notifications */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.rowLabel}>Daily prompt time</Text>
            <Text style={styles.rowValue}>{getTimeDisplay(currentTime)} {'>'}</Text>
          </TouchableOpacity>
          <View style={styles.rowToggle}>
            <Text style={styles.rowLabel}>Remind me to respond</Text>
            <Switch
              value={remindMe}
              onValueChange={handleToggleRemind}
              trackColor={{ false: '#e7e5e4', true: '#e9b8a3' }}
              thumbColor={remindMe ? '#c97454' : '#fafaf9'}
            />
          </View>
          <View style={[styles.rowToggle, styles.lastRow]}>
            <Text style={styles.rowLabel}>Notify when partner responds</Text>
            <Switch
              value={partnerNotify}
              onValueChange={handleTogglePartnerNotify}
              trackColor={{ false: '#e7e5e4', true: '#e9b8a3' }}
              thumbColor={partnerNotify ? '#c97454' : '#fafaf9'}
            />
          </View>
        </View>

        {/* Partnership */}
        <PartnershipSection
          sectionTitleStyle={styles.sectionTitle}
          sectionStyle={styles.section}
          rowStyle={styles.row}
          lastRowStyle={styles.lastRow}
          rowLabelStyle={styles.rowLabel}
          rowValueStyle={styles.rowValue}
          dangerTextStyle={styles.dangerText}
        />

        {/* Account */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email || 'Not signed in'}</Text>
          </View>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <Text style={styles.rowLabel}>Sign out</Text>
            <Text style={styles.rowValue}>{'>'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.lastRow]} onPress={handleDeleteAccount}>
            <Text style={styles.dangerText}>Delete account</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <TouchableOpacity style={[styles.row, styles.lastRow]} onPress={() => router.push('/(app)/privacy-policy')}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.rowValue}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Safety */}
        <View style={styles.safety}>
          <Text style={styles.safetyText}>
            Closer is not therapy or crisis support. If you feel unsafe in your relationship, please seek help.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('tel:1-800-799-7233')}>
            <Text style={styles.safetyLink}>National Domestic Violence Hotline</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daily prompt time</Text>
            <Text style={styles.modalSubtitle}>
              When should your daily prompt arrive?
            </Text>

            {TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption,
                  currentTime === option.value && styles.timeOptionActive,
                ]}
                onPress={() => handleTimeChange(option.value)}
                disabled={isSavingTime}
              >
                <View style={[
                  styles.radio,
                  currentTime === option.value && styles.radioActive,
                ]}>
                  {currentTime === option.value && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.timeOptionText,
                  currentTime === option.value && styles.timeOptionTextActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716c',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  rowToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1c1917',
  },
  rowValue: {
    fontSize: 16,
    color: '#78716c',
  },
  dangerText: {
    fontSize: 16,
    color: '#f87171',
  },
  safety: {
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    marginBottom: 48,
  },
  safetyText: {
    fontSize: 14,
    color: '#57534e',
    lineHeight: 20,
  },
  safetyLink: {
    fontSize: 14,
    color: '#c97454',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 20,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fafaf9',
  },
  timeOptionActive: {
    backgroundColor: '#fef3ee',
    borderWidth: 1,
    borderColor: '#e9b8a3',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6d3d1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#c97454',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#c97454',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#57534e',
  },
  timeOptionTextActive: {
    color: '#c97454',
    fontWeight: '500',
  },
  modalClose: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#78716c',
  },
});
