import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Icon } from '@components';
import { SwipeableRow } from '@components';
import type { Milestone } from '@/hooks/useMilestones';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  isPremium: boolean;
  onShowPaywall: () => void;
}

export function MilestoneTimeline({ milestones, onAdd, onDelete, isPremium, onShowPaywall }: MilestoneTimelineProps) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={isPremium ? onAdd : onShowPaywall}
          activeOpacity={0.8}
        >
          <Icon name="plus" size="sm" color="#D4522A" />
          <Text style={styles.addBtnText}>Add milestone</Text>
        </TouchableOpacity>
      </Animated.View>

      {milestones.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.empty}>
          <Text style={styles.emptyTitle}>No milestones yet</Text>
          <Text style={styles.emptySubtitle}>
            Mark the moments that matter — anniversaries, trips, firsts.
          </Text>
        </Animated.View>
      ) : (
        milestones.map((milestone, index) => (
          <Animated.View
            key={milestone.id}
            entering={FadeInUp.duration(400).delay(Math.min(index * 80, 400))}
          >
            <SwipeableRow
              rightActions={[{
                label: 'Remove',
                color: '#ef4444',
                onPress: () => onDelete(milestone.id),
              }]}
            >
              <View style={styles.card}>
                <View style={styles.timeline}>
                  <View style={styles.dot} />
                  {index < milestones.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.dateText}>{format(milestone.date, 'MMMM d, yyyy')}</Text>
                  <Text style={styles.titleText}>{milestone.title}</Text>
                  {milestone.description ? (
                    <Text style={styles.descText}>{milestone.description}</Text>
                  ) : null}
                  {milestone.imageUrl ? (
                    <Image
                      source={{ uri: milestone.imageUrl }}
                      style={styles.milestoneImage}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              </View>
            </SwipeableRow>
          </Animated.View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fef3ee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9a07a',
    marginBottom: 24,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
    color: '#D4522A',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#6B6B7A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4522A',
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2DED8',
    marginTop: 4,
  },
  cardContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginLeft: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2DED8',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#6B6B7A',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
    color: '#1E1E2E',
    marginBottom: 4,
  },
  descText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    lineHeight: 20,
    marginBottom: 8,
  },
  milestoneImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 4,
  },
});
