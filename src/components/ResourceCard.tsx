import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { logEvent } from '@/services/analytics';
import type { TherapistResource } from '@/config/therapistResources';
import { Icon } from './Icon';

interface ResourceCardProps {
  resource: TherapistResource;
  delay?: number;
}

export function ResourceCard({ resource, delay = 0 }: ResourceCardProps) {
  const handlePress = () => {
    logEvent('resource_link_opened', {
      resource_id: resource.id,
      category: resource.category,
    });
    Linking.openURL(resource.url);
  };

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(delay)}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{resource.icon}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {resource.name}
            </Text>
            {resource.isFree && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>Free</Text>
              </View>
            )}
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {resource.description}
          </Text>
        </View>

        <Icon name="caret-right" size="sm" color="#a8a29e" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef7f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#292524',
    flex: 1,
  },
  freeBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
  },
  description: {
    fontSize: 13,
    color: '#78716c',
    lineHeight: 18,
  },
});
