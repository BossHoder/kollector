/**
 * Register Screen
 *
 * Features:
 * - Email/password form with validation
 * - Password confirmation
 * - Auto-login after successful registration
 * - Error toast for API failures
 * - Navigation back to Login
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../styles/tokens';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register, isLoading: authLoading } = useAuth();
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const isLoading = authLoading || isSubmitting;

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    // Confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setApiError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email.trim(), password);
      toast.success('Account created successfully');
      // Navigation handled automatically by RootNavigator
    } catch (error) {
      const message = error.message || 'Registration failed';
      setApiError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (apiError) {
      setApiError(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Kollector today</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
              disabled={isLoading}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
              secureTextEntry
              autoComplete="new-password"
              error={errors.password}
              helperText={!errors.password ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
              disabled={isLoading}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearFieldError('confirmPassword');
              }}
              secureTextEntry
              autoComplete="new-password"
              error={errors.confirmPassword}
              disabled={isLoading}
            />

            {apiError && (
              <Text style={styles.apiError}>{apiError}</Text>
            )}

            <Button
              testID="register-button"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.submitButton}
            >
              Create Account
            </Button>
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
            testID="login-link"
            accessibilityLabel="Go back to login"
            accessibilityRole="button"
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSizes['3xl'],
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  form: {
    gap: spacing.sm,
  },
  apiError: {
    color: colors.statusFailed,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  loginLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
    padding: spacing.md,
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
});
