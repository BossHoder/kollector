interface ProcessingQuotaBannerProps {
  processingUsed: number;
  processingLimit: number;
  nextResetAt: string;
  tier: 'free' | 'vip';
  onAction: () => void;
}

function formatResetDate(nextResetAt: string) {
  const parsedDate = new Date(nextResetAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'soon';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsedDate);
}

export function ProcessingQuotaBanner({
  processingUsed,
  processingLimit,
  nextResetAt,
  tier,
  onAction,
}: ProcessingQuotaBannerProps) {
  const safeUsed = Number.isFinite(processingUsed) ? Math.max(0, processingUsed) : 0;
  const safeLimit = Number.isFinite(processingLimit) ? Math.max(1, processingLimit) : 1;
  const remaining = Math.max(safeLimit - safeUsed, 0);
  const atLimit = remaining === 0;
  const formattedResetDate = formatResetDate(nextResetAt);

  return (
    <section
      className="rounded-xl border border-sky-300/40 bg-sky-100/70 p-4 text-sky-950"
      data-testid="processing-quota-banner"
    >
      <p className="text-sm font-semibold">
        {atLimit ? 'Monthly processing quota reached' : `${remaining} processing uses left`}
      </p>
      <p className="mt-1 text-sm">
        {atLimit
          ? `You are on ${tier.toUpperCase()} and have reached ${safeLimit}/${safeLimit} processing uses this month.`
          : `You are using ${safeUsed}/${safeLimit} processing uses this month.`}
      </p>
      <p className="mt-1 text-sm">{`Resets ${formattedResetDate}`}</p>
      <button
        type="button"
        className="mt-3 rounded-lg bg-sky-900 px-3 py-2 text-sm font-medium text-white"
        onClick={onAction}
      >
        {atLimit ? 'Upgrade to VIP' : 'Analyze asset'}
      </button>
    </section>
  );
}

export default ProcessingQuotaBanner;
