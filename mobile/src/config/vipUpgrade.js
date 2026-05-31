export const VIP_UPGRADE_BANK_NAME = 'VPBANK';
export const VIP_UPGRADE_BANK_BIN = '970432';
export const VIP_UPGRADE_ACCOUNT_NAME = 'TRUONG THE ANH';
export const VIP_UPGRADE_ACCOUNT_NUMBER = '0362688938';
export const VIP_UPGRADE_AMOUNT_VND = 99000;
export const VIP_UPGRADE_CURRENCY = 'VND';

export function buildVipUpgradeReference() {
  return `VIP-${Date.now()}`;
}

export function buildVipUpgradeQrUrl(transferReference) {
  const params = new URLSearchParams({
    amount: String(VIP_UPGRADE_AMOUNT_VND),
    addInfo: transferReference,
    accountName: VIP_UPGRADE_ACCOUNT_NAME,
  });

  return `https://img.vietqr.io/image/${VIP_UPGRADE_BANK_BIN}-${VIP_UPGRADE_ACCOUNT_NUMBER}-compact2.png?${params.toString()}`;
}

export function formatVipUpgradeAmount(amount = VIP_UPGRADE_AMOUNT_VND) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
}
