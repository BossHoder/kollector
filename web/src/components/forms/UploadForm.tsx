/**
 * UploadForm component
 *
 * Form for uploading assets with drag-drop, file picker, and category selector
 * Matches Stitch prototype design from stitch_kollector_upload_page
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';

// Category options
export const CATEGORIES = [
  { value: 'sneaker', label: 'Giày Sneaker' },
  { value: 'lego', label: 'LEGO' },
  { value: 'camera', label: 'Máy Ảnh' },
  { value: 'other', label: 'Khác' },
] as const;

export type Category = (typeof CATEGORIES)[number]['value'];

// Validation schema
const categoryValues = ['sneaker', 'lego', 'camera', 'other'] as const;
const uploadSchema = z.object({
  category: z.enum(categoryValues, {
    message: 'Vui lòng chọn danh mục',
  }),
});

export type UploadFormData = z.infer<typeof uploadSchema> & {
  file: File;
};

export interface UploadFormProps {
  onSubmit: (data: UploadFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function UploadForm({ onSubmit, isLoading = false, error }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<{ category: Category }>({
    resolver: zodResolver(uploadSchema),
  });

  const selectedCategory = watch('category');

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return 'Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)';
    }

    if (file.size > maxSize) {
      return 'Kích thước file tối đa là 10MB';
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      return;
    }

    setFileError(null);
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  // Handle input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag events
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

  // Handle form submit
  const onFormSubmit = handleSubmit(async (data) => {
    if (!selectedFile) {
      setFileError('Vui lòng chọn hình ảnh');
      return;
    }

    await onSubmit({
      ...data,
      file: selectedFile,
    });
  });

  // Clear selected file
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
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
          <span className="material-symbols-outlined text-[20px] flex-shrink-0">
            error
          </span>
          <p>{error}</p>
        </div>
      )}

      {/* Dropzone */}
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
          // Preview state
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
          // Empty state
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

      {/* File Error */}
      {fileError && <p className="text-red-400 text-sm">{fileError}</p>}

      {/* Category Select */}
      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium text-white block">
          Danh mục
        </label>
        <select
          {...register('category')}
          id="category"
          disabled={isLoading}
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
          <option value="">Chọn danh mục...</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-red-400 text-sm">{errors.category.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isLoading}
        disabled={isLoading}
      >
        <span className="material-symbols-outlined text-[20px]">upload</span>
        Tải lên
      </Button>
    </form>
  );
}
