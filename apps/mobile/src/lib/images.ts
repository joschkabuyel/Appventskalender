import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  fileSize: number | null;
  mimeType: string | null;
}

/** Öffnet die Galerie. `aspect` aktiviert den Zuschneide-Dialog (z. B. [9, 16] für Hintergründe). */
export async function pickImage(aspect?: [number, number]): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Boolean(aspect),
    aspect,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize ?? null,
    mimeType: asset.mimeType ?? null,
  };
}
