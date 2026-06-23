import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface AnniversaryPickerProps {
  visible: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSave: (date: Date) => void;
  onClose: () => void;
  saving: boolean;
  title: string;
  subtitle: string;
  cancelLabel: string;
  saveLabel: string;
}

export function AnniversaryPicker({
  visible,
  selectedDate,
  onDateChange,
  onSave,
  onClose,
  saving,
  title,
  subtitle,
  cancelLabel,
  saveLabel,
}: AnniversaryPickerProps) {
  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>{subtitle}</Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={(_, date) => { if (date) onDateChange(date); }}
              style={styles.datePicker}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={onClose}
              >
                <Text style={styles.modalCancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={() => onSave(selectedDate)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>{saveLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Android: inline picker (no modal wrapper needed)
  if (!visible) return null;

  return (
    <DateTimePicker
      value={selectedDate}
      mode="date"
      maximumDate={new Date()}
      onChange={(_, date) => {
        onClose();
        if (date) onSave(date);
      }}
    />
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'Nunito-Black',
    color: '#1E1E2E',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    marginBottom: 16,
  },
  datePicker: {
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#E2DED8',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B6B7A',
    fontWeight: '500',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#D4522A',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
