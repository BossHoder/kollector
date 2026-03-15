/**
 * Upload Screen
 *
 * Features:
 * - Camera/Gallery image picker
 * - Category selection
 * - Image validation (type, size <= 10MB)
 * - Submit button in thumb-zone
 * - Upload progress indication
 * - Confirm-on-leave during active upload
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { pickImageFromGallery, pickImageFromCamera } from '../../services/imagePicker';
import { uploadAsset } from '../../api/uploadApi';
import { validateUploadFile, getSupportedTypesText, getMaxFileSizeText } from '../../utils/uploadValidation';
import { colors, spacing, typography, borderRadius, touchTargetSize } from '../../styles/tokens';

// Category options (must match server VALID_CATEGORIES)
const CATEGORIES = [
  { key: 'sneaker', label: 'Giày' },
  { key: 'lego', label: 'Lego' },
  { key: 'camera', label: 'Máy ảnh' },
  { key: 'other', label: 'Khác' },
];

export default function UploadScreen() {
  const navigation = useNavigation();
  const toast = useToast();

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  // Determine if submit should be enabled
  const canSubmit = selectedImage && selectedCategory && !isUploading;

  // Handle navigation interception during upload
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isUploading) {
        // Not uploading, allow navigation
        return;
      }

      // Uploading - prevent navigation and show confirmation
      e.preventDefault();

      Alert.alert(
        'Hủy tải lên?',
        'Việc rời khỏi trang sẽ hủy quá trình tải lên. Bạn có chắc muốn tiếp tục?',
        [
          { text: 'Tiếp tục tải lên', style: 'cancel' },
          {
            text: 'Rời khỏi trang',
            style: 'destructive',
            onPress: () => {
              setIsUploading(false);
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isUploading]);

  const handleSelectImage = useCallback(() => {
    setShowSourcePicker(true);
  }, []);

  const handleImagePicked = useCallback((image) => {
    if (!image) {
      setShowSourcePicker(false);
      return;
    }

    // Validate the picked image
    const validation = validateUploadFile(image);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      setShowSourcePicker(false);
      return;
    }

    setSelectedImage(image);
    setShowSourcePicker(false);
  }, [toast]);

  const handlePickFromGallery = useCallback(async () => {
    const image = await pickImageFromGallery();
    handleImagePicked(image);
  }, [handleImagePicked]);

  const handlePickFromCamera = useCallback(async () => {
    const image = await pickImageFromCamera();
    handleImagePicked(image);
  }, [handleImagePicked]);

  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsUploading(true);

    try {
      const result = await uploadAsset({
        uri: selectedImage.uri,
        type: selectedImage.type,
        fileName: selectedImage.fileName,
        category: selectedCategory.key,
      });

      toast.success('Bắt đầu tải lên! Đang xử lý ảnh của bạn...');
      
      // Navigate to asset detail
      navigation.navigate('AssetDetail', { assetId: result.asset.id });

      // Reset form
      setSelectedImage(null);
      setSelectedCategory(null);
    } catch (error) {
      toast.error(error.message || 'Tải lên không thành công. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  }, [canSubmit, selectedImage, selectedCategory, navigation, toast]);

  const handleChangeImage = useCallback(() => {
    setShowSourcePicker(true);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tải lên tài sản</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ảnh</Text>
          
          {selectedImage ? (
            <View style={styles.selectedImageContainer}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.selectedImage}
                resizeMode="cover"
                testID="selected-image"
              />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={handleChangeImage}
                testID="change-image-button"
              >
                <Text style={styles.changeImageText}>Thay đổi ảnh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleSelectImage}
              testID="select-image-button"
            >
              <View style={styles.addPhotoContent}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Chọn ảnh</Text>
                <Text style={styles.addPhotoHint}>
                  {getSupportedTypesText()} • Max {getMaxFileSizeText()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <View style={styles.categoryGrid} testID="category-selector">
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryChip,
                  selectedCategory?.key === category.key && styles.categoryChipSelected,
                ]}
                onPress={() => handleCategorySelect(category)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedCategory?.key === category.key }}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory?.key === category.key && styles.categoryChipTextSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Submit Button (in thumb zone) */}
      <View style={styles.footer}>
        <Button
          testID="submit-button"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isUploading}
          fullWidth
          size="large"
        >
          {isUploading ? 'Đang tải lên...' : 'Gửi để phân tích'}
        </Button>
      </View>

      {/* Source Picker Modal */}
      {showSourcePicker && (
        <View style={styles.sourcePickerOverlay}>
          <TouchableOpacity
            style={styles.sourcePickerBackdrop}
            onPress={() => setShowSourcePicker(false)}
            activeOpacity={1}
          />
          <View style={styles.sourcePickerSheet}>
            <Text style={styles.sourcePickerTitle}>Chọn ảnh</Text>
            
            <TouchableOpacity
              style={styles.sourceOption}
              onPress={handlePickFromCamera}
              testID="source-camera"
            >
              <Text style={styles.sourceOptionIcon}>📸</Text>
              <Text style={styles.sourceOptionText}>Máy ảnh</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.sourceOption}
              onPress={handlePickFromGallery}
              testID="source-gallery"
            >
              <Text style={styles.sourceOptionIcon}>🖼️</Text>
              <Text style={styles.sourceOptionText}>Thư viện ảnh</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.sourceOption, styles.sourceOptionCancel]}
              onPress={() => setShowSourcePicker(false)}
            >
              <Text style={styles.sourceOptionCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.borderDark,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSizes['2xl'],
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // Image selection
  addPhotoButton: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.borderDark,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
  },
  addPhotoContent: {
    alignItems: 'center',
  },
  addPhotoIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  addPhotoText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  addPhotoHint: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  selectedImageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[800],
  },
  changeImageButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  changeImageText: {
    fontSize: typography.fontSizes.base,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },

  // Category selection
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderDark,
    minHeight: touchTargetSize,
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
  },
  categoryChipTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.medium,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    backgroundColor: colors.backgroundDark,
  },

  // Source picker
  sourcePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sourcePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sourcePickerSheet: {
    backgroundColor: colors.surfaceDark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sourcePickerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: touchTargetSize,
  },
  sourceOptionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  sourceOptionText: {
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
  },
  sourceOptionCancel: {
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    paddingTop: spacing.md,
  },
  sourceOptionCancelText: {
    fontSize: typography.fontSizes.lg,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
