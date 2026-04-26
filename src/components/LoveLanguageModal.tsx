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
                      <Icon name="check" size="sm" color="#c97454" weight="bold" />
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginBottom: 16,
  },
  langList: {
    maxHeight: 340,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fef7f4',
    gap: 12,
  },
  langOptionActive: {
    backgroundColor: '#fef5f0',
    borderWidth: 1,
    borderColor: '#f9a07a',
  },
  langOptionIcon: {
    fontSize: 24,
  },
  langOptionInfo: {
    flex: 1,
  },
  langOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  langOptionLabelActive: {
    color: '#c97454',
  },
  langOptionDesc: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 2,
  },
  langOptionDescActive: {
    color: '#c97454',
  },
  langCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c97454',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelFull: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#78716c',
    fontWeight: '500',
  },
});
