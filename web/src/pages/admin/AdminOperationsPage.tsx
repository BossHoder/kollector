import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminFailedJobs, getAdminQueueStatus } from '@/lib/adminApi';

export function AdminOperationsPage() {
  const queryClient = useQueryClient();
  const queueStatusQuery = useQuery({
    queryKey: ['admin-queue-status'],
    queryFn: getAdminQueueStatus,
  });
  const failedJobsQuery = useQuery({
    queryKey: ['admin-failed-jobs'],
    queryFn: () => getAdminFailedJobs(20),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border-dark bg-surface-dark/80 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Vận hành</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Tình trạng Queue</h2>
            <p className="mt-3 max-w-2xl text-sm text-text-secondary">
              Màn hình chỉ đọc để theo dõi Queue AI, Queue enhancement, số liệu ack và danh
              sách job lỗi cần kiểm tra thủ công.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['admin-queue-status'] });
              void queryClient.invalidateQueries({ queryKey: ['admin-failed-jobs'] });
              void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
            }}
            className="rounded-2xl border border-border-dark px-4 py-3 text-sm font-medium text-text-secondary transition hover:border-primary/40 hover:text-white"
          >
            Làm mới
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          title="Queue AI"
          lines={
            queueStatusQuery.data
              ? [
                  `Chờ: ${queueStatusQuery.data.data.aiProcessing.waiting}`,
                  `Đang xử lý: ${queueStatusQuery.data.data.aiProcessing.active}`,
                  `Thất bại: ${queueStatusQuery.data.data.aiProcessing.failed}`,
                ]
              : ['Đang tải...']
          }
        />
        <MetricCard
          title="Queue Enhancement"
          lines={
            queueStatusQuery.data
              ? [
                  `Chờ: ${queueStatusQuery.data.data.assetEnhancement.waiting}`,
                  `Đang xử lý: ${queueStatusQuery.data.data.assetEnhancement.active}`,
                  `Thất bại: ${queueStatusQuery.data.data.assetEnhancement.failed}`,
                ]
              : ['Đang tải...']
          }
        />
        <MetricCard
          title="Ack Enhancement"
          lines={
            queueStatusQuery.data
              ? [
                  `Chấp nhận: ${queueStatusQuery.data.data.enhancementAck.accepted}`,
                  `Xung đột: ${queueStatusQuery.data.data.enhancementAck.conflicts}`,
                  `Lỗi: ${queueStatusQuery.data.data.enhancementAck.failures}`,
                ]
              : ['Đang tải...']
          }
        />
      </section>

      {queueStatusQuery.isError ? (
        <p className="text-red-400">Không thể tải số liệu Queue.</p>
      ) : null}

      {queueStatusQuery.data?.data.lastRefreshedAt ? (
        <p className="text-sm text-text-muted">
          Cập nhật lần cuối {new Date(queueStatusQuery.data.data.lastRefreshedAt).toLocaleString()}
        </p>
      ) : null}

      <section className="rounded-3xl border border-border-dark bg-surface-dark/80 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Job lỗi</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Danh sách cần kiểm tra</h3>
          </div>
          {failedJobsQuery.data?.data ? (
            <span className="text-sm text-text-secondary">{failedJobsQuery.data.data.length} dòng</span>
          ) : null}
        </div>

        {failedJobsQuery.isLoading ? (
          <p className="text-text-secondary">Đang tải danh sách job lỗi...</p>
        ) : null}
        {failedJobsQuery.isError ? (
          <p className="text-red-400">Không thể tải danh sách job lỗi.</p>
        ) : null}
        {!failedJobsQuery.isLoading && failedJobsQuery.data?.data?.length === 0 ? (
          <p className="text-text-secondary">Không có job lỗi nào cần xem.</p>
        ) : null}

        <div className="space-y-3">
          {(failedJobsQuery.data?.data ?? []).map((job) => (
            <div
              key={`${job.queueName}-${job.id}`}
              className="rounded-2xl border border-border-dark bg-[#0d1b19] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-medium text-white">
                    {job.queueName} · job {job.id}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">{job.failureReason}</p>
                </div>
                <div className="text-sm text-text-secondary">
                  <p>Tài sản: {job.assetId || 'n/a'}</p>
                  <p>Người dùng: {job.userId || 'n/a'}</p>
                  <p>
                    Lần thử: {job.attemptsMade}/{job.maxAttempts}
                  </p>
                  <p>Thất bại lúc: {job.failedAt ? new Date(job.failedAt).toLocaleString() : 'n/a'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-3xl border border-border-dark bg-[#0d1b19] p-5">
      <p className="text-sm text-text-secondary">{title}</p>
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-lg font-medium text-white">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export default AdminOperationsPage;
