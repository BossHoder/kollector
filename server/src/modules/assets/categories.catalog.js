const CURRENT_CATEGORY_OPTIONS = [
  { value: 'cards', label: 'Thẻ' },
  { value: 'stamps', label: 'Tem' },
  { value: 'coins', label: 'Tiền xu' },
  { value: 'toys', label: 'Đồ chơi' },
  { value: 'art', label: 'Nghệ thuật' },
  { value: 'memorabilia', label: 'Kỷ vật' },
  { value: 'other', label: 'Khác', allowCustomValue: true },
];

function getAssetCategoryOptions() {
  return CURRENT_CATEGORY_OPTIONS.map((option) => ({
    ...option,
    allowCustomValue: Boolean(option.allowCustomValue),
  }));
}

module.exports = {
  CURRENT_CATEGORY_OPTIONS,
  getAssetCategoryOptions,
};
