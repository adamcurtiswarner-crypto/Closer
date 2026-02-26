import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components';
import { useAcceptInvite } from '@/hooks/useCouple';
import { clearPendingInviteCode } from '@/hooks/useDeepLink';
import { useTranslation } from 'react-i18next';

export default function AcceptInviteScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState('');
  const acceptInvite = useAcceptInvite();
  const hasAutoSubmitted = useRef(false);
  const { t } = useTranslation();

  // Handle code from deep link params
  useEffect(() => {
    if (codeParam && codeParam.length === 6) {
      setCode(codeParam.toUpperCase());
    }
  }, [codeParam]);

  // Auto-submit if code came from deep link
  useEffect(() => {
    if (
      codeParam &&
      code.length === 6 &&
      !hasAutoSubmitted.current &&
      !acceptInvite.isPending
    ) {
      hasAutoSubmitted.current = true;
      handleAccept();
    }
  }, [code, codeParam, acceptInvite.isPending]);

  const handleAccept = async () => {
    if (code.length !== 6) {
      Alert.alert(t('common.error'), t('onboarding.acceptInvite.enterSixChar'));
      return;
    }

    try {
      await acceptInvite.mutateAsync(code.toUpperCase());
      await clearPendingInviteCode();
      router.replace('/(onboarding)/preferences');
    } catch (error: any) {
      hasAutoSubmitted.current = false; // Allow retry
      Alert.alert(
        t('onboarding.acceptInvite.invalidCode'),
        t('onboarding.acceptInvite.invalidCodeBody')
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentCentered}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerCenter}>
          <Text style={styles.title}>
            {t('onboarding.acceptInvite.title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.acceptInvite.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            placeholderTextColor="#d6d3d1"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.joinButtonContainer}>
          <Button
            title={t('onboarding.acceptInvite.join')}
            onPress={handleAccept}
            loading={acceptInvite.isPending}
            disabled={code.length !== 6}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <Button
            title={t('common.back')}
            variant="ghost"
            onPress={() => router.back()}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  contentCentered: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
    textAlign: 'center',
  },
  subtitle: {
    color: '#57534e',
    textAlign: 'center',
    marginTop: 8,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    textAlign: 'center',
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#c97454',
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  joinButtonContainer: {
    marginTop: 32,
  },
});
