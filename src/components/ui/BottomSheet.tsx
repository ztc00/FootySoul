import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radius, spacing, fontSizes, fontWeights } from '@/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  applyLabel?: string;
  resetLabel?: string;
  onApply?: () => void;
  onReset?: () => void;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  applyLabel = 'Apply',
  resetLabel = 'Reset',
  onApply,
  onReset,
}: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.actions}>
                {onReset ? (
                  <Pressable onPress={onReset} style={styles.headerBtn}>
                    <Text style={styles.resetText}>{resetLabel}</Text>
                  </Pressable>
                ) : null}
                {onApply ? (
                  <Pressable onPress={onApply} style={[styles.headerBtn, styles.applyBtn]}>
                    <Text style={styles.applyText}>{applyLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={styles.content}>{children}</View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  keyboard: { maxHeight: SCREEN_HEIGHT * 0.9 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing[6],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerBtn: { paddingVertical: spacing[2], paddingHorizontal: spacing[2] },
  resetText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  applyBtn: {},
  applyText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.accent },
  content: { paddingHorizontal: spacing[4], maxHeight: SCREEN_HEIGHT * 0.6 },
});
