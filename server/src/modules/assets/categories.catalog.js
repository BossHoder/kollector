const CURRENT_CATEGORY_OPTIONS = [
  { value: 'sneaker', label: 'Giày sneaker' },
  { value: 'lego', label: 'LEGO' },
  { value: 'camera', label: 'Máy ảnh' },
  { value: 'other', label: 'Khác' },
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
