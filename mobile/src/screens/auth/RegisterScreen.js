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
      newErrors.email = 'Email là bắt buộc';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Mật khẩu phải có tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`;
    }

    // Confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
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
      toast.success('Tài khoản đã được tạo thành công');
      // Navigation handled automatically by RootNavigator
    } catch (error) {
      const message = error.message || 'Đăng ký không thành công';
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
          <Text style={styles.title}>Bắt đầu sưu tầm</Text>
          <Text style={styles.subtitle}>Tạo tài khoản để quản lý bộ sưu tập của bạn</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
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
              label="Mật khẩu"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearFieldError('password');
              }}
              secureTextEntry
              autoComplete="new-password"
              error={errors.password}
              helperText={!errors.password ? `Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự` : undefined}
              disabled={isLoading}
            />

            <Input
              label="Xác nhận mật khẩu"
              placeholder="••••••••"
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
              Tạo tài khoản
            </Button>
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
            testID="login-link"
            accessibilityLabel="Quay lại đăng nhập"
            accessibilityRole="button"
          >
            <Text style={styles.loginText}>
              Đã có tài khoản? <Text style={styles.loginTextBold}>Đăng nhập</Text>
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
