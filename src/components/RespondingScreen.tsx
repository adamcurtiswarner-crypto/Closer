import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@components';
import { useTranslation } from 'react-i18next';

interface RespondingScreenProps {
  promptText: string;
  responseText: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onAddPhoto: () => void;
  selectedImage: string | null;
  onRemovePhoto: () => void;
  isPending: boolean;
}

export function RespondingScreen({
  promptText,
  responseText,
  onChangeText,
  onSubmit,
  onCancel,
  onAddPhoto,
  selectedImage,
  onRemovePhoto,
  isPending,
}: RespondingScreenProps) {
  const { t } = useTranslation();
  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.respondingScroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.duration(300)} style={styles.respondingHeader}>
            <Text style={styles.respondingPrompt}>
              {'\u201C'}{promptText}{'\u201D'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <TextInput
              style={styles.textInput}
              placeholder={t('today.sharePlaceholder')}
              placeholderTextColor="#a8a29e"
              multiline
              textAlignVertical="top"
              value={responseText}
              onChangeText={onChangeText}
              autoFocus
            />
          </Animated.View>

          {selectedImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity style={styles.removeImage} onPress={onRemovePhoto}>
                <Icon name="x" size="xs" color="#ffffff" weight="bold" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.attachPhotoButton} onPress={onAddPhoto}>
              <Icon name="camera" size="md" color="#78716c" />
              <Text style={styles.attachPhotoText}>{t('today.addPhoto')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.respondingFooter}>
            <Text style={styles.charHint}>
              {responseText.length < 10
                ? t('today.moreCharacters', { count: 10 - responseText.length })
                : t('today.readyToShare')}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Back</Text>
              </TouchableOpacity>
              <Animated.View style={[{ flex: 1 }, submitAnimStyle]}>
                <TouchableOpacity
                  style={[styles.submitButton, (responseText.length < 10 || isPending) && styles.disabled]}
                  onPress={onSubmit}
                  onPressIn={() => { submitScale.value = withTiming(0.96, { duration: 100 }); }}
                  onPressOut={() => { submitScale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
                  disabled={responseText.length < 10 || isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitText}>
                    {isPending ? t('today.sending') : t('today.share')}
                  </Text>
                  {!isPending && <Icon name="arrow-right" size="sm" color="#ffffff" />}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  respondingScroll: {
    paddingTop: 32,
    paddingBottom: 32,
    flexGrow: 1,
  },
  respondingHeader: {
    marginBottom: 24,
  },
  respondingPrompt: {
    fontSize: 18,
    color: '#57534e',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 17,
    color: '#1c1917',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    minHeight: 140,
    maxHeight: 240,
    lineHeight: 24,
  },
  attachPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f4',
    borderRadius: 10,
  },
  attachPhotoText: {
    fontSize: 14,
    color: '#78716c',
    fontWeight: '500',
  },
  imagePreview: {
    marginTop: 12,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#57534e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  respondingFooter: {
    marginTop: 12,
  },
  charHint: {
    color: '#a8a29e',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f4',
    borderRadius: 14,
  },
  cancelText: {
    color: '#57534e',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
