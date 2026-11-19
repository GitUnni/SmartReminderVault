import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Shrinks a photo and returns it as base64, so uploads stay small and fast
export async function shrinkToBase64(uri: string, width = 1280): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  return out.base64 as string;
}