/**
 * Upload Screen
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { pickImageFromGallery, pickImageFromCamera } from '../../services/imagePicker';
import { uploadAsset } from '../../api/uploadApi';
import { validateUploadFile, getSupportedTypesText, getMaxFileSizeText } from '../../utils/uploadValidation';
import { colors, spacing, typography, borderRadius, touchTargetSize } from '../../styles/tokens';
import { usePendingUploadContext } from '../../contexts/PendingUploadContext';
import { useAssetCategories } from '../../hooks/useAssetCategories';

function resolveUploadExtension(image) {
  const originalName = image?.fileName || '';
  if (originalName.includes('.')) {
    return originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  }

  if (image?.type === 'image/png') return '.png';
  if (image?.type === 'image/webp') return '.webp';
  if (image?.type === 'image/gif') return '.gif';
  return '.jpg';
}

function buildUploadFilename(assetName, image) {
  return `${String(assetName || '').trim().replace(/\.[^.]+$/, '')}${resolveUploadExtension(image)}`;
}

export default function UploadScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { categories, isLoading: isLoadingCategories } = useAssetCategories();

  const [selectedImage, setSelectedImage] = useState(null);
  const [assetName, setAssetName] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [runAi, setRunAi] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showRetryAction, setShowRetryAction] = useState(false);
  const { addPendingUpload } = usePendingUploadContext();

  const resolvedCategory = useMemo(() => {
    if (!selectedCategoryKey) {
      return null;
    }

    if (selectedCategoryKey === 'other') {
      return customCategoryName.trim() || 'other';
    }

    return selectedCategoryKey;
  }, [customCategoryName, selectedCategoryKey]);

  const canSubmit = Boolean(selectedImage && assetName.trim() && resolvedCategory && !isUploading);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isUploading) {
        return;
      }

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

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedImage || !resolvedCategory) {
      return;
    }

    const trimmedAssetName = assetName.trim();
    const uploadFilename = buildUploadFilename(trimmedAssetName, selectedImage);

    setIsUploading(true);

    try {
      const result = await uploadAsset({
        uri: selectedImage.uri,
        type: selectedImage.type,
        fileName: uploadFilename,
        category: resolvedCategory,
        assetName: trimmedAssetName,
        runAi,
      });

      toast.success(
        runAi
          ? 'Đã tải lên và bắt đầu xử lý AI.'
          : 'Đã lưu tài sản thành công.'
      );

      navigation.navigate('AssetDetail', { assetId: result.asset.id });
      setShowRetryAction(false);
      setSelectedImage(null);
      setAssetName('');
      setSelectedCategoryKey(null);
      setCustomCategoryName('');
      setRunAi(true);
    } catch (error) {
      addPendingUpload({
        imageUri: selectedImage.uri,
        category: resolvedCategory,
        title: trimmedAssetName,
        originalFilename: uploadFilename,
        status: 'failed_upload',
        errorMessage: error.message || 'Tải lên không thành công',
      });
      setShowRetryAction(true);
      toast.error(error.message || 'Tải lên không thành công. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  }, [addPendingUpload, assetName, canSubmit, navigation, resolvedCategory, runAi, selectedImage, toast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tải lên tài sản</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
                onPress={() => setShowSourcePicker(true)}
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
              accessibilityRole="button"
              accessibilityLabel="Chọn ảnh để tải lên"
              accessibilityHint="Mở tùy chọn máy ảnh hoặc thư viện"
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

        <Input
          label="Tên tài sản"
          placeholder="Ví dụ: Bộ thẻ Dragon Ball"
          value={assetName}
          onChangeText={setAssetName}
          disabled={isUploading}
          testID="asset-name-input"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <View style={styles.categoryGrid} testID="category-selector">
            {categories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryChip,
                  selectedCategoryKey === category.value && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategoryKey(category.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedCategoryKey === category.value }}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategoryKey === category.value && styles.categoryChipTextSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isLoadingCategories && (
            <Text style={styles.helperText}>Đang tải danh mục...</Text>
          )}
        </View>

        {selectedCategoryKey === 'other' && (
          <Input
            label="Tên danh mục tùy chỉnh"
            placeholder="Ví dụ: Mô hình Gundam"
            value={customCategoryName}
            onChangeText={setCustomCategoryName}
            disabled={isUploading}
            testID="custom-category-input"
          />
        )}

        <TouchableOpacity
          style={styles.aiToggleCard}
          onPress={() => setRunAi((prev) => !prev)}
          accessibilityRole="switch"
          accessibilityState={{ checked: runAi }}
          testID="ai-toggle"
        >
          <View style={styles.aiToggleContent}>
            <Text style={styles.aiToggleTitle}>Xử lý ảnh bằng AI</Text>
            <Text style={styles.aiToggleDescription}>
              Có thể tắt nếu bạn chỉ muốn lưu file và metadata ngay.
            </Text>
          </View>
          <View style={[styles.aiSwitch, runAi && styles.aiSwitchActive]}>
            <View style={[styles.aiSwitchThumb, runAi && styles.aiSwitchThumbActive]} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          testID="submit-button"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isUploading}
          fullWidth
          size="large"
        >
          {isUploading ? 'Đang tải lên...' : runAi ? 'Gửi để phân tích' : 'Lưu tài sản'}
        </Button>
        {showRetryAction && canSubmit && (
          <Button
            testID="retry-upload-button"
            onPress={handleSubmit}
            variant="secondary"
            fullWidth
            style={styles.retryUploadButton}
          >
            Retry Upload
          </Button>
        )}
      </View>

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
              accessibilityRole="button"
              accessibilityLabel="Mở máy ảnh"
            >
              <Text style={styles.sourceOptionIcon}>📸</Text>
              <Text style={styles.sourceOptionText}>Máy ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sourceOption}
              onPress={handlePickFromGallery}
              testID="source-gallery"
              accessibilityRole="button"
              accessibilityLabel="Mở thư viện ảnh"
            >
              <Text style={styles.sourceOptionIcon}>🖼️</Text>
              <Text style={styles.sourceOptionText}>Thư viện ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceOption, styles.sourceOptionCancel]}
              onPress={() => setShowSourcePicker(false)}
              accessibilityRole="button"
              accessibilityLabel="Đóng bộ chọn nguồn ảnh"
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
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.sm,
  },
  addPhotoButton: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.borderDark,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    minHeight: touchTargetSize,
    justifyContent: 'center',
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
    minHeight: touchTargetSize,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  changeImageText: {
    fontSize: typography.fontSizes.base,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
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
  aiToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceDark,
    padding: spacing.lg,
    gap: spacing.md,
  },
  aiToggleContent: {
    flex: 1,
    gap: spacing.xs,
  },
  aiToggleTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
  },
  aiToggleDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
  },
  aiSwitch: {
    width: 54,
    height: 32,
    borderRadius: 32,
    backgroundColor: colors.surfaceHighlight,
    padding: 4,
    justifyContent: 'center',
  },
  aiSwitchActive: {
    backgroundColor: colors.primary,
  },
  aiSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 24,
    backgroundColor: colors.white,
  },
  aiSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    backgroundColor: colors.backgroundDark,
  },
  retryUploadButton: {
    marginTop: spacing.sm,
  },
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
