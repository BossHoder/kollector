/**
 * UploadForm component
 *
 * Form for uploading assets with drag-drop, file picker, and category selector
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import type { AssetCategoryOption } from '@/hooks/useAssetCategories';

const uploadSchema = z.object({
  assetName: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên tài sản'),
  category: z
    .string()
    .trim()
    .min(1, 'Vui lòng chọn danh mục'),
  customCategory: z
    .string()
    .trim(),
  runAi: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.category === 'other' && !data.customCategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['customCategory'],
      message: 'Vui lòng nhập tên danh mục',
    });
  }
});

export type UploadFormData = {
  assetName: string;
  category: string;
  runAi: boolean;
  file: File;
};

export interface UploadFormProps {
  onSubmit: (data: UploadFormData) => Promise<void>;
  categoryOptions: AssetCategoryOption[];
  isCategoryLoading?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export function UploadForm({
  onSubmit,
  categoryOptions,
  isCategoryLoading = false,
  isLoading = false,
  error,
}: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      assetName: '',
      category: '',
      customCategory: '',
      runAi: true,
    },
  });

  const selectedCategory = watch('category');
  const selectedCategoryOption = categoryOptions.find((option) => option.value === selectedCategory);
  const showCustomCategory = Boolean(selectedCategoryOption?.allowCustomValue);

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)';
    }

    if (file.size > maxSize) {
      return 'Kích thước file tối đa là 10MB';
    }

    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const nextFileError = validateFile(file);
    if (nextFileError) {
      setFileError(nextFileError);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const onFormSubmit = handleSubmit(async (data) => {
    if (!selectedFile) {
      setFileError('Vui lòng chọn hình ảnh');
      return;
    }

    await onSubmit({
      assetName: data.assetName.trim(),
      category: data.category === 'other' ? data.customCategory : data.category,
      runAi: data.runAi,
      file: selectedFile,
    });
  });

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
          <span className="material-symbols-outlined text-[20px] flex-shrink-0">
            error
          </span>
          <p>{error}</p>
        </div>
      )}

      <div
        data-testid="dropzone"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border-dark hover:border-primary/50 bg-surface-dark',
          fileError ? 'border-red-500' : '',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          data-testid="file-input"
          disabled={isLoading}
        />

        {selectedFile && previewUrl ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 rounded-lg mx-auto"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <p className="text-text-secondary text-sm">{selectedFile.name}</p>
            <p className="text-text-secondary text-xs">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <>
            <span className="material-symbols-outlined text-6xl text-primary/50 mb-4 block">
              cloud_upload
            </span>
            <p className="text-white font-medium mb-2">
              Kéo thả hình ảnh vào đây
            </p>
            <p className="text-text-secondary text-sm">
              hoặc click để chọn file
            </p>
            <p className="text-text-secondary text-xs mt-2">
              JPEG, PNG, GIF, WebP (tối đa 10MB)
            </p>
          </>
        )}
      </div>

      {fileError && <p className="text-red-400 text-sm">{fileError}</p>}

      <div className="space-y-2">
        <label htmlFor="asset-name" className="text-sm font-medium text-white block">
          Tên tài sản
        </label>
        <input
          {...register('assetName')}
          id="asset-name"
          disabled={isLoading}
          placeholder="Ví dụ: Album tem Nhật Bản"
          className={[
            'w-full bg-[#111817] text-white border rounded-lg px-4 py-3 text-base',
            'placeholder:text-[#4a635e]',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-1',
            errors.assetName
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-[#3b5450] focus:border-primary focus:ring-primary',
          ].join(' ')}
        />
        {errors.assetName && (
          <p className="text-red-400 text-sm">{errors.assetName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium text-white block">
          Danh mục
        </label>
        <select
          {...register('category')}
          id="category"
          disabled={isLoading || isCategoryLoading}
          className={[
            'w-full bg-[#111817] text-white border rounded-lg px-4 py-3 text-base',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-1',
            errors.category
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-[#3b5450] focus:border-primary focus:ring-primary',
          ].join(' ')}
        >
          <option value="">
            {isCategoryLoading ? 'Đang tải danh mục...' : 'Chọn danh mục...'}
          </option>
          {categoryOptions.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-red-400 text-sm">{errors.category.message}</p>
        )}

        {showCustomCategory && (
          <>
            <input
              {...register('customCategory')}
              id="custom-category"
              disabled={isLoading}
              placeholder="Nhập tên danh mục tùy chỉnh"
              className={[
                'w-full bg-[#111817] text-white border rounded-lg px-4 py-3 text-base',
                'placeholder:text-[#4a635e]',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-1',
                errors.customCategory
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-[#3b5450] focus:border-primary focus:ring-primary',
              ].join(' ')}
            />
            {errors.customCategory && (
              <p className="text-red-400 text-sm">{errors.customCategory.message}</p>
            )}
          </>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border-dark bg-[#111817] px-4 py-3">
        <input
          type="checkbox"
          {...register('runAi')}
          disabled={isLoading}
          className="mt-1 h-4 w-4 accent-[rgb(37,244,209)]"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium text-white">Xử lý ảnh bằng AI</span>
          <span className="block text-sm text-text-secondary">
            Có thể tắt nếu bạn chỉ muốn lưu asset và metadata file ngay.
          </span>
        </span>
      </label>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isLoading}
        disabled={isLoading || isCategoryLoading}
      >
        <span className="material-symbols-outlined text-[20px]">upload</span>
        Tải lên
      </Button>
    </form>
  );
}
