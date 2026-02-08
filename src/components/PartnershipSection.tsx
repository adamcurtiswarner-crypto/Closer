import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { useCouple, usePendingInvite, useCreateInvite, useCancelInvite, useDisconnectPartner } from '@/hooks/useCouple';
import { usePartner } from '@/hooks/usePartner';

interface PartnershipSectionProps {
  sectionTitleStyle: object;
  sectionStyle: object;
  rowStyle: object;
  lastRowStyle: object;
  rowLabelStyle: object;
  rowValueStyle: object;
  dangerTextStyle: object;
}

export function PartnershipSection({
  sectionTitleStyle,
  sectionStyle,
  rowStyle,
  lastRowStyle,
  rowLabelStyle,
  rowValueStyle,
  dangerTextStyle,
}: PartnershipSectionProps) {
  const { data: couple, isLoading: coupleLoading } = useCouple();
  const { data: partner, isLoading: partnerLoading } = usePartner();
  const { data: pendingInvite, isLoading: inviteLoading } = usePendingInvite();
  const createInvite = useCreateInvite();
  const cancelInvite = useCancelInvite();
  const disconnectPartner = useDisconnectPartner();

  const isLoading = coupleLoading || partnerLoading || inviteLoading;

  const handleCreateInvite = async () => {
    try {
      const result = await createInvite.mutateAsync();
      // Share the invite
      await Share.share({
        message: `Join me on Closer! Use code ${result.code} or tap: ${result.shareUrl}`,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invite');
    }
  };

  const handleShareInvite = async () => {
    if (!pendingInvite) return;
    try {
      await Share.share({
        message: `Join me on Closer! Use code ${pendingInvite.code} or tap: https://closer.app/join/${pendingInvite.code}`,
      });
    } catch (error) {
      // User cancelled share
    }
  };

  const handleCancelInvite = () => {
    Alert.alert(
      'Cancel Invite',
      'Are you sure you want to cancel this invite?',
      [
        { text: 'Keep Invite', style: 'cancel' },
        {
          text: 'Cancel Invite',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelInvite.mutateAsync();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel invite');
            }
          },
        },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Partner',
      'Are you sure you want to disconnect from your partner? This will remove your connection and you will need to reconnect with a new invite code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectPartner.mutateAsync();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to disconnect');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <>
        <Text style={sectionTitleStyle}>PARTNERSHIP</Text>
        <View style={[sectionStyle, styles.loadingContainer]}>
          <ActivityIndicator color="#c97454" />
        </View>
      </>
    );
  }

  // State 1: Connected to partner
  if (couple?.status === 'active' && partner) {
    return (
      <>
        <Text style={sectionTitleStyle}>PARTNERSHIP</Text>
        <View style={sectionStyle}>
          <View style={rowStyle}>
            <Text style={rowLabelStyle}>Partner</Text>
            <Text style={rowValueStyle}>
              {partner.displayName || partner.email}
            </Text>
          </View>
          {couple.linkedAt && (
            <View style={rowStyle}>
              <Text style={rowLabelStyle}>Connected since</Text>
              <Text style={rowValueStyle}>
                {format(couple.linkedAt, 'MMM d, yyyy')}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[rowStyle, lastRowStyle]}
            onPress={handleDisconnect}
            disabled={disconnectPartner.isPending}
          >
            <Text style={dangerTextStyle}>
              {disconnectPartner.isPending ? 'Disconnecting...' : 'Disconnect partner'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // State 2: Has pending invite
  if (pendingInvite) {
    return (
      <>
        <Text style={sectionTitleStyle}>PARTNERSHIP</Text>
        <View style={sectionStyle}>
          <View style={rowStyle}>
            <Text style={rowLabelStyle}>Invite code</Text>
            <Text style={[rowValueStyle, styles.codeText]}>{pendingInvite.code}</Text>
          </View>
          <TouchableOpacity style={rowStyle} onPress={handleShareInvite}>
            <Text style={rowLabelStyle}>Share invite</Text>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[rowStyle, lastRowStyle]}
            onPress={handleCancelInvite}
            disabled={cancelInvite.isPending}
          >
            <Text style={dangerTextStyle}>
              {cancelInvite.isPending ? 'Cancelling...' : 'Cancel invite'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // State 3: No partner, no invite
  return (
    <>
      <Text style={sectionTitleStyle}>PARTNERSHIP</Text>
      <View style={sectionStyle}>
        <TouchableOpacity
          style={[rowStyle, lastRowStyle]}
          onPress={handleCreateInvite}
          disabled={createInvite.isPending}
        >
          <Text style={rowLabelStyle}>
            {createInvite.isPending ? 'Creating invite...' : 'Invite partner'}
          </Text>
          <Text style={styles.actionText}>+</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  codeText: {
    fontFamily: 'Courier',
    fontWeight: '600',
    letterSpacing: 2,
  },
  actionText: {
    fontSize: 16,
    color: '#c97454',
    fontWeight: '500',
  },
});
