import { ASSET_THEME_PRESETS } from '@/lib/assetThemePresets';

interface ThemeSelectorProps {
  lockedPresetIds: string[];
  selectedThemeId: string | null | undefined;
  disabled?: boolean;
  onSelect: (themeId: string | null) => void;
}

export function ThemeSelector({
  lockedPresetIds,
  selectedThemeId,
  disabled = false,
  onSelect,
}: ThemeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ASSET_THEME_PRESETS.filter((preset) => preset.active).map((preset) => {
          const locked = lockedPresetIds.includes(preset.id);
          const selected = selectedThemeId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              disabled={disabled || locked}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-border-dark bg-surface-dark hover:border-white/20'
              } ${locked ? 'cursor-not-allowed opacity-55' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: preset.tokenSet.accent }}
                  />
                  <span className="font-medium text-white">{preset.name}</span>
                </div>
                {locked ? (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                    VIP
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-text-secondary">
                {locked ? 'Upgrade to VIP to apply this preset.' : 'Available for your current tier.'}
              </p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        disabled={disabled}
        className="rounded-lg border border-border-dark px-4 py-2 text-sm font-medium text-text-secondary transition hover:text-white disabled:opacity-60"
      >
        Clear override
      </button>
    </div>
  );
}

export default ThemeSelector;
