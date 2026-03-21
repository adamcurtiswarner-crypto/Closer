import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { pickImage } from '@/services/imageUpload';
import { Icon } from './Icon';

interface ChatInputProps {
  onSend: (text: string, imageUri?: string | null) => void;
  onTyping?: (isTyping: boolean) => void;
  isSending: boolean;
}

export function ChatInput({ onSend, onTyping, isSending }: ChatInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const canSend = (text.trim().length > 0 || imageUri) && !isSending;

  const handleTextChange = (value: string) => {
    setText(value);
    onTyping?.(value.length > 0);
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim(), imageUri);
    setText('');
    setImageUri(null);
    onTyping?.(false);
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) setImageUri(uri);
  };

  return (
    <View style={styles.container}>
      {imageUri && (
        <View style={styles.imagePreviewRow}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeImage}
            onPress={() => setImageUri(null)}
          >
            <Icon name="x" size="xs" color="#ffffff" weight="bold" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickImage}
          activeOpacity={0.7}
        >
          <Icon name="camera" size="md" color="#78716c" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={t('chat.messagePlaceholder')}
          placeholderTextColor="#a8a29e"
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[styles.sendButton, canSend ? styles.sendButtonActive : undefined]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Icon name="arrow-up" size="sm" color={canSend ? '#ffffff' : '#a8a29e'} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
    backgroundColor: '#fef7f4',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  removeImage: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#57534e',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  photoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1c1917',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e7e5e4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonActive: {
    backgroundColor: '#c97454',
  },
});
