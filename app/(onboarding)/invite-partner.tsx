import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Share,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Button } from '@/components';
import { useCreateInvite, usePendingInvite } from '@/hooks/useCouple';

export default function InvitePartnerScreen() {
  const { data: pendingInvite } = usePendingInvite();
  const createInvite = useCreateInvite();
  const [inviteCode, setInviteCode] = useState<string | null>(
    pendingInvite?.code || null
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite.mutateAsync();
      setInviteCode(result.code);
      setShareUrl(result.shareUrl);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invite.');
    }
  };

  const handleCopyCode = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
      Alert.alert('Copied', 'Invite code copied to clipboard.');
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;

    try {
      await Share.share({
        message: `I'm trying Closer — an app for us to stay connected. Join me: ${shareUrl}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // If already have invite, show it
  if (inviteCode || pendingInvite?.code) {
    const code = inviteCode || pendingInvite?.code;

    return (
      <SafeAreaView className="flex-1 bg-warm-50">
        <View className="flex-1 px-6 justify-center">
          <View className="items-center mb-8">
            <Text className="text-2xl font-bold text-warm-900 text-center">
              Invite your partner
            </Text>
            <Text className="text-warm-600 text-center mt-2">
              Closer works best together. Send this to your partner.
            </Text>
          </View>

          {/* Invite code display */}
          <TouchableOpacity
            onPress={handleCopyCode}
            className="bg-white rounded-2xl p-6 items-center border border-warm-200 mb-4"
          >
            <Text className="text-4xl font-mono font-bold text-primary-500 tracking-widest">
              {code}
            </Text>
            <Text className="text-warm-500 text-sm mt-2">
              Tap to copy
            </Text>
          </TouchableOpacity>

          <Text className="text-warm-500 text-xs text-center mb-6">
            Valid for 7 days
          </Text>

          <Button title="Share" onPress={handleShare} />

          <View className="h-4" />

          <Button
            title="I'll wait for them to join"
            variant="secondary"
            onPress={() => router.push('/(onboarding)/waiting-partner')}
          />

          {/* Already have an invite to accept */}
          <TouchableOpacity
            className="mt-6"
            onPress={() => router.push('/(onboarding)/accept-invite')}
          >
            <Text className="text-primary-500 text-center">
              I have an invite code
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No invite yet
  return (
    <SafeAreaView className="flex-1 bg-warm-50">
      <View className="flex-1 px-6 justify-center">
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-warm-900 text-center">
            Invite your partner
          </Text>
          <Text className="text-warm-600 text-center mt-2">
            Closer works best together. Create an invite to send to your partner.
          </Text>
        </View>

        <Button
          title="Create Invite"
          onPress={handleCreateInvite}
          loading={createInvite.isPending}
        />

        <View className="h-4" />

        <Button
          title="I have an invite code"
          variant="secondary"
          onPress={() => router.push('/(onboarding)/accept-invite')}
        />
      </View>
    </SafeAreaView>
  );
}
