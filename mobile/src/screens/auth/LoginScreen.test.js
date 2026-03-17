/**
 * LoginScreen Tests
 *
 * Component tests for login form:
 * - Form validation (email format, password required)
 * - Submit behavior
 * - Error display
 * - Navigation to register
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigation } from '@react-navigation/native';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('LoginScreen', () => {
  const mockLogin = jest.fn();
  const mockNavigate = jest.fn();
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    showToast: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
    });
    
    useToast.mockReturnValue(mockToast);
    
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
  });

  describe('Rendering', () => {
    it('should render email input', () => {
      render(<LoginScreen />);
      
      expect(screen.getByPlaceholderText(/email/i)).toBeTruthy();
    });

    it('should render password input', () => {
      render(<LoginScreen />);
      
      expect(screen.getByLabelText(/^Mật khẩu$/i)).toBeTruthy();
    });

    it('should render login button', () => {
      render(<LoginScreen />);
      
      expect(screen.getByTestId('login-button')).toBeTruthy();
    });

    it('should render register link', () => {
      render(<LoginScreen />);
      
      expect(screen.getByTestId('register-link')).toBeTruthy();
    });
  });

  describe('Form validation', () => {
    it('should show error for empty email', async () => {
      render(<LoginScreen />);
      
      const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);
      fireEvent.changeText(passwordInput, 'password123');
      
      const submitButton = screen.getByTestId('login-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email.*trống/i)).toBeTruthy();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error for invalid email format', async () => {
      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);
      
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, 'password123');
      
      const submitButton = screen.getByTestId('login-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email.*hợp lệ/i)).toBeTruthy();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error for empty password', async () => {
      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@example.com');
      
      const submitButton = screen.getByTestId('login-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/mật khẩu.*trống/i)).toBeTruthy();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should not submit with validation errors', async () => {
      render(<LoginScreen />);
      
      // Submit empty form
      const submitButton = screen.getByTestId('login-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });
  });

  describe('Submission', () => {
    it('should call login with email and password on valid submit', async () => {
      mockLogin.mockResolvedValue(undefined);
      
      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      
      const submitButton = screen.getByTestId('login-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show loading state during submission', async () => {
      // Make login return a slow promise
      let resolveLogin;
      mockLogin.mockReturnValue(new Promise(resolve => {
        resolveLogin = resolve;
      }));
      
      useAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true, // Simulate loading
      });
      
      render(<LoginScreen />);
      
      // Button should show loading indicator or be disabled
      const submitButton = screen.getByTestId('login-button');
      expect(submitButton.props.accessibilityState?.disabled || 
             submitButton.props.disabled).toBeTruthy();
    });

    it('should forward API error message to toast on login failure', async () => {
      const apiError = new Error('ThÃ´ng tin Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡');
      mockLogin.mockRejectedValue(apiError);
      
      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      
      const submitButton = screen.getByTestId('login-button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(apiError.message);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to register screen when register link pressed', () => {
      render(<LoginScreen />);
      
      const registerLink = screen.getByTestId('register-link');
      fireEvent.press(registerLink);

      expect(mockNavigate).toHaveBeenCalledWith('Register');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels on inputs', () => {
      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);
      
      expect(emailInput.props.accessibilityLabel || emailInput.props.accessible).toBeTruthy();
      expect(passwordInput.props.accessibilityLabel || passwordInput.props.accessible).toBeTruthy();
    });

    it('should mask password input', () => {
      render(<LoginScreen />);
      
      const passwordInput = screen.getByLabelText(/^Mật khẩu$/i);
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should have proper keyboard types', () => {
      render(<LoginScreen />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      expect(emailInput.props.keyboardType).toBe('email-address');
    });
  });
});
