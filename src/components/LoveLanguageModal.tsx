import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LOVE_LANGUAGES } from '@/config/loveLanguages';
import { Icon } from './Icon';

import { colors, spacing, typography } from '@/config/theme';
interface LoveLanguageModalProps {
  visible: boolean;
  currentValue: string | null;
  saving: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
  title: string;
  subtitle: string;
  cancelLabel: string;
}

export function LoveLanguageModal({
  visible,
  currentValue,
  saving,
  onSelect,
  onClose,
  title,
  subtitle,
  cancelLabel,
}: LoveLanguageModalProps) {
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
          <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
            {LOVE_LANGUAGES.map((lang) => {
              const isActive = currentValue === lang.value;
              return (
                <TouchableOpacity
                  key={lang.value}
                  style={[styles.langOption, isActive && styles.langOptionActive]}
                  onPress={() => onSelect(lang.value)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.langOptionIcon}>{lang.icon}</Text>
                  <View style={styles.langOptionInfo}>
                    <Text style={[styles.langOptionLabel, isActive && styles.langOptionLabelActive]}>
                      {lang.label}
                    </Text>
                    <Text style={[styles.langOptionDesc, isActive && styles.langOptionDescActive]}>
                      {lang.description}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={styles.langCheck}>
                      <Icon name="check" size="sm" color={colors.accent.primary} weight="bold" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCancelFull}
            onPress={onClose}
          >
            <Text style={styles.modalCancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  langList: {
    maxHeight: 340,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface.background,
    gap: spacing.smd,
  },
  langOptionActive: {
    backgroundColor: colors.surface.warmTint,
    borderWidth: 1,
    borderColor: colors.border.accent,
  },
  langOptionIcon: {
    ...typography.headingLg,
  },
  langOptionInfo: {
    flex: 1,
  },
  langOptionLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  langOptionLabelActive: {
    color: colors.accent.primary,
  },
  langOptionDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  langOptionDescActive: {
    color: colors.accent.primary,
  },
  langCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelFull: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
