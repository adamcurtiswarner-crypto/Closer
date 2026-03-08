import React from 'react';
import {
  View,
  Image,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Icon } from '@components';
import type { PhotoItem } from '@/hooks/usePhotoGrid';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

interface PhotoViewerProps {
  photo: PhotoItem | null;
  visible: boolean;
  onClose: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  response: 'From a prompt',
  chat: 'From chat',
  standalone: 'Album photo',
};

export function PhotoViewer({ photo, visible, onClose }: PhotoViewerProps) {
  if (!photo) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <SafeHeader onClose={onClose} />

        <Animated.View entering={FadeIn.duration(300)} style={styles.imageWrap}>
          <Image
            source={{ uri: photo.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(300).delay(100)} style={styles.info}>
          <Text style={styles.source}>{SOURCE_LABELS[photo.source] || 'Photo'}</Text>
          <Text style={styles.date}>{format(photo.date, 'MMMM d, yyyy')}</Text>
          {photo.context ? (
            <Text style={styles.context} numberOfLines={3}>{photo.context}</Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function SafeHeader({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Icon name="x" size="sm" color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.6,
  },
  info: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  source: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 6,
  },
  context: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
});
