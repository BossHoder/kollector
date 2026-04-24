interface AssetCapBannerProps {
  assetUsed: number;
  assetLimit: number;
  tier: 'free' | 'vip';
  onCreate: () => void;
}

export function AssetCapBanner({ assetUsed, assetLimit, tier, onCreate }: AssetCapBannerProps) {
  const safeUsed = Number.isFinite(assetUsed) ? Math.max(0, assetUsed) : 0;
  const safeLimit = Number.isFinite(assetLimit) ? Math.max(1, assetLimit) : 1;
  const remaining = Math.max(safeLimit - safeUsed, 0);
  const atLimit = remaining === 0;

  const title = atLimit
    ? 'Asset limit reached'
    : `${remaining} slots left in your current tier`;

  const description = atLimit
    ? `You are on ${tier.toUpperCase()} and have reached ${safeLimit} assets. Upgrade to VIP to continue creating assets.`
    : `You are using ${safeUsed}/${safeLimit} assets.`;

  return (
    <section
      className="rounded-xl border border-amber-300/40 bg-amber-100/70 p-4 text-amber-950"
      data-testid="asset-cap-banner"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{description}</p>
      <button
        type="button"
        className="mt-3 rounded-lg bg-amber-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        onClick={() => {
          if (!atLimit) {
            onCreate();
          }
        }}
      >
        {atLimit ? 'Upgrade to VIP' : 'Create asset'}
      </button>
    </section>
  );
}

export default AssetCapBanner;
