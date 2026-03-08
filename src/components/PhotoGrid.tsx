import React from 'react';
import {
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { PhotoItem } from '@/hooks/usePhotoGrid';

const { width } = Dimensions.get('window');
const GAP = 2;
const COLUMNS = 3;
const THUMB_SIZE = (width - 48 - GAP * (COLUMNS - 1)) / COLUMNS;

interface PhotoGridProps {
  photos: PhotoItem[];
  onPhotoPress: (photo: PhotoItem) => void;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
  ListHeaderComponent?: React.ReactElement;
}

export function PhotoGrid({ photos, onPhotoPress, onEndReached, isLoadingMore, ListHeaderComponent }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
        <Text style={styles.emptyTitle}>No photos yet</Text>
        <Text style={styles.emptySubtitle}>
          Photos from your prompts, chats, and uploads will appear here.
        </Text>
      </Animated.View>
    );
  }

  return (
    <FlatList
      data={photos}
      numColumns={COLUMNS}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.thumb}
          onPress={() => onPhotoPress(item)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} />
        </TouchableOpacity>
      )}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#c97454" />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingBottom: 24,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#57534e',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    textAlign: 'center',
    marginTop: 8,
  },
  loading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
