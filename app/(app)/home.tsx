import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useConversationStarter } from '@/hooks/useConversationStarter';
import { ConversationStarterCard } from '@/components/ConversationStarterCard';
import { ConversationStarterModal } from '@/components/ConversationStarterModal';
import { RecommendedCard, RecommendedItem } from '@/components/RecommendedCard';
import { Icon } from '@/components/Icon';
import { PROMPT_CATEGORIES } from '@/config/promptCategories';
import { logEvent } from '@/services/analytics';

const RELATIONSHIP_STAGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  comfortable_but_busy: { label: 'Comfortable but busy', color: '#8b6914', bg: '#fef3c7' },
  new_and_exciting: { label: 'New and exciting', color: '#166534', bg: '#dcfce7' },
  a_little_disconnected: { label: 'A little disconnected', color: '#9a3412', bg: '#ffedd5' },
  going_through_a_lot: { label: 'Going through a lot', color: '#7c2d12', bg: '#fce4de' },
  deep_and_steady: { label: 'Deep and steady', color: '#1e40af', bg: '#dbeafe' },
  in_a_bit_of_a_rut: { label: 'In a bit of a rut', color: '#6b21a8', bg: '#f3e8ff' },
  reduce_stress: { label: 'Reduce stress', color: '#0f766e', bg: '#ccfbf1' },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const starter = useConversationStarter();
  const [modalVisible, setModalVisible] = useState(false);

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const stage = user?.toneCalibration;
  const stageInfo = stage ? RELATIONSHIP_STAGE_LABELS[stage] : null;

  const recommended: RecommendedItem[] = useMemo(() => {
    const cats = PROMPT_CATEGORIES.slice(0, 2).map((cat) => ({
      id: `cat-${cat.type}`,
      type: 'category' as const,
      title: cat.label,
      subtitle: 'CATEGORY',
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
      targetId: cat.type,
    }));
    const activities = PROMPT_CATEGORIES.slice(2, 5).map((cat) => ({
      id: `act-${cat.type}`,
      type: 'activity' as const,
      title: cat.label,
      subtitle: 'ACTIVITY · 3-10 MIN',
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
      targetId: cat.type,
    }));
    return [...cats, ...activities];
  }, []);

  const handleRecommendedPress = (item: RecommendedItem) => {
    logEvent('explore_category_tapped', { category: item.targetId });
    router.push({ pathname: '/(app)/explore', params: { category: item.targetId } });
  };

  const handleStartConversation = () => {
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.subtitle}>We hope you have a good day</Text>
          </View>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push('/(app)/chat')}
          >
            <Icon name="chat-text" size="md" color="#57534e" />
          </TouchableOpacity>
        </Animated.View>

        {/* Relationship stage pill */}
        {stageInfo && (
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <TouchableOpacity
              style={[styles.stagePill, { backgroundColor: stageInfo.bg }]}
              onPress={() => router.push('/(app)/settings')}
            >
              <Text style={[styles.stagePillText, { color: stageInfo.color }]}>
                {stageInfo.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Daily Thought */}
        <View style={styles.section}>
          <ConversationStarterCard
            starter={starter}
            onStart={handleStartConversation}
          />
        </View>

        {/* Recommended for you */}
        <View style={styles.section}>
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.duration(500).delay(500)}>
            <FlatList
              data={recommended}
              renderItem={({ item }) => (
                <RecommendedCard item={item} onPress={handleRecommendedPress} />
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendedList}
            />
          </Animated.View>
        </View>
      </ScrollView>

      <ConversationStarterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        starterText={starter.topic}
        durationMinutes={starter.durationMinutes}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginTop: 4,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  stagePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  stagePillText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  recommendedList: {
    paddingRight: 20,
  },
});
