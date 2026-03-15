/**
 * Login Screen
 *
 * Features:
 * - Email/password form with validation
 * - Error toast for API failures
 * - Navigation to Register
 * - Accessible inputs with proper labels
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

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, isLoading: authLoading } = useAuth();
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const isLoading = authLoading || isSubmitting;

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email không được để trống';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Email không hợp lệ';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Mật khẩu không được để trống';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setApiError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Đã đăng nhập thành công');
    } catch (error) {
      const message = error.message || 'Thông tin đăng nhập không hợp lệ';
      setApiError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: null }));
    }
    if (apiError) {
      setApiError(null);
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    // Clear error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: null }));
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
          <Text style={styles.title}>Kollector</Text>
          <Text style={styles.subtitle}>Tiếp tục hành trình sưu tầm của bạn</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="vidu@email.com"
              value={email}
              onChangeText={handleEmailChange}
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
              onChangeText={handlePasswordChange}
              secureTextEntry
              autoComplete="password"
              error={errors.password}
              disabled={isLoading}
            />

            {apiError && (
              <Text style={styles.apiError}>{apiError}</Text>
            )}

            <Button
              testID="login-button"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.submitButton}
            >
              Đăng nhập
            </Button>
          </View>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
            testID="register-link"
            accessibilityLabel="Tạo tài khoản"
            accessibilityRole="button"
          >
            <Text style={styles.registerText}>
              Chưa có tài khoản? <Text style={styles.registerTextBold}>Tạo tài khoản</Text>
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
  registerLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
    padding: spacing.md,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  registerTextBold: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
});
