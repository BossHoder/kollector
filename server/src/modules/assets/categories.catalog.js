const CURRENT_CATEGORY_OPTIONS = [
  { value: 'sneaker', label: 'Giay Sneaker' },
  { value: 'lego', label: 'LEGO' },
  { value: 'camera', label: 'May anh' },
  { value: 'other', label: 'Khac' },
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
