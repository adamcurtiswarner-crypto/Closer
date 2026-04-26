import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { RESOURCE_CATEGORIES, getResourcesByCategory } from '@/config/therapistResources';
import { ResourceCard } from '@/components/ResourceCard';
import { Icon } from '@/components';
import { useTranslation } from 'react-i18next';
import { logEvent } from '@/services/analytics';

export default function ResourcesScreen() {
  const { t } = useTranslation();
  useEffect(() => {
    logEvent('resource_viewed');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size="md" color="#1c1917" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('resources.title')}</Text>
        <View style={styles.backButton} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Intro */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Text style={styles.intro}>
            {t('resources.intro')}
          </Text>
        </Animated.View>

        {/* Resource sections */}
        {RESOURCE_CATEGORIES.map((category, catIndex) => {
          const resources = getResourcesByCategory(category.value);
          if (resources.length === 0) return null;

          return (
            <Animated.View
              key={category.value}
              entering={FadeInUp.duration(400).delay(200 + catIndex * 100)}
            >
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <View>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </View>
              </View>

              {resources.map((resource, idx) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  delay={300 + catIndex * 100 + idx * 60}
                />
              ))}
            </Animated.View>
          );
        })}

        {/* Safety footer */}
        <Animated.View entering={FadeIn.duration(400).delay(800)}>
          <View style={styles.safety}>
            <Text style={styles.safetyText}>
              {t('resources.safetyFooter')}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#57534e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 15,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#292524',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#a8a29e',
    fontFamily: 'Inter-Regular',
    marginTop: 1,
  },
  safety: {
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
  },
  safetyText: {
    fontSize: 14,
    color: '#57534e',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
});
