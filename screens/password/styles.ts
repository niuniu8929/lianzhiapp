import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: Spacing['2xl'],
    },
    logoSection: {
      alignItems: 'center',
      marginTop: Spacing['6xl'],
      marginBottom: Spacing['3xl'],
    },
    logoContainer: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    title: {
      marginBottom: Spacing.sm,
    },
    subtitle: {
      textAlign: 'center',
    },
    inputSection: {
      marginTop: Spacing.xl,
    },
    inputGroup: {
      marginBottom: Spacing.xl,
    },
    label: {
      marginBottom: Spacing.sm,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: Spacing.lg,
      height: 56,
    },
    inputIcon: {
      marginRight: Spacing.md,
    },
    input: {
      flex: 1,
      fontSize: 16,
      height: '100%',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    errorText: {
      marginLeft: Spacing.xs,
    },
    buttonSection: {
      marginTop: Spacing.xl,
    },
    primaryButton: {
      height: 56,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hintSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      bottom: Spacing['3xl'],
      left: Spacing['2xl'],
      right: Spacing['2xl'],
    },
    hintText: {
      marginLeft: Spacing.sm,
      textAlign: 'center',
    },
  });
};
