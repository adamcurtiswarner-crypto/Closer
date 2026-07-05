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

import { colors, spacing, typography } from '@/config/theme';
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
                  <ActivityIndicator color={colors.text.inverse} size="small" />
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
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  datePicker: {
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.smd,
    marginTop: spacing.md,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.border.default,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  modalSave: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
  },
  modalSaveText: {
    ...typography.body,
    color: colors.text.inverse,
  },
});
