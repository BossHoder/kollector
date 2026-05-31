import * as Clipboard from 'expo-clipboard';

export async function copyToClipboard(value) {
  await Clipboard.setStringAsync(String(value ?? ''));
}
