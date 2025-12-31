/**
 * UploadPage
 *
 * Page for uploading new assets with category selection
 * Matches Stitch prototype design from stitch_kollector_upload_page
 */

import { useEffect } from 'react';
import { Link, useNavigate, useBlocker } from 'react-router-dom';
import { UploadForm, type UploadFormData } from '@/components/forms/UploadForm';
import { useUploadAsset } from '@/hooks/useUploadAsset';
import { ApiError } from '@/lib/api-client';

export function UploadPage() {
  const navigate = useNavigate();
  const uploadMutation = useUploadAsset();
  const isUploading = uploadMutation.isPending;

  // Block in-app navigation during upload
  const blocker = useBlocker(isUploading);

  // Block browser navigation (refresh, close tab) during upload
  useEffect(() => {
    if (!isUploading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but we still need to set returnValue
      e.returnValue = 'Đang tải lên. Bạn có chắc muốn rời khỏi trang?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  const handleSubmit = async (data: UploadFormData) => {
    try {
      const result = await uploadMutation.mutateAsync({
        file: data.file,
        category: data.category,
      });

      // Redirect to asset detail page
      navigate(`/app/assets/${result.data.assetId}`);
    } catch (error) {
      // Error is handled by React Query and displayed via error prop
      console.error('Upload failed:', error);
    }
  };

  // Extract error message from various error formats
  let errorMessage: string | null = null;
  if (uploadMutation.error) {
    if (uploadMutation.error instanceof ApiError) {
      // API error format - could be { message: "..." } or { error: { message: "..." } }
      const details = uploadMutation.error.details as { error?: { message?: string } } | undefined;
      errorMessage = details?.error?.message ?? uploadMutation.error.message;
    } else if (uploadMutation.error instanceof Error) {
      errorMessage = uploadMutation.error.message;
    } else {
      errorMessage = 'Đã xảy ra lỗi khi tải lên';
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Navigation Blocker Dialog */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-dark border border-border-dark rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Đang tải lên...
            </h3>
            <p className="text-text-secondary mb-6">
              Việc rời khỏi trang sẽ hủy quá trình tải lên. Bạn có chắc muốn tiếp tục?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => blocker.reset?.()}
                className="px-4 py-2 text-sm font-medium text-white bg-surface-dark border border-border-dark rounded-lg hover:bg-border-dark transition-colors"
              >
                Tiếp tục tải lên
              </button>
              <button
                type="button"
                onClick={() => blocker.proceed?.()}
                className="px-4 py-2 text-sm font-medium text-white bg-stitch-red rounded-lg hover:bg-stitch-red/80 transition-colors"
              >
                Rời khỏi trang
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Back Link */}
      <Link
        to="/app"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-6"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        <span>Quay lại thư viện</span>
      </Link>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Tải lên tài sản</h1>
        <p className="text-text-secondary mt-1">
          Thêm tài sản mới vào bộ sưu tập của bạn
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-surface-dark border border-border-dark rounded-xl p-6 sm:p-8">
        <UploadForm
          onSubmit={handleSubmit}
          isLoading={uploadMutation.isPending}
          error={errorMessage}
        />
      </div>

      {/* Tips Section */}
      <div className="mt-6 text-sm text-text-secondary space-y-2">
        <p className="font-medium text-white">💡 Mẹo để có kết quả tốt nhất:</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>Chụp ảnh rõ nét với ánh sáng tốt</li>
          <li>Đảm bảo tài sản nằm trong khung hình</li>
          <li>Chọn đúng danh mục để AI phân tích chính xác hơn</li>
        </ul>
      </div>
    </div>
  );
}
