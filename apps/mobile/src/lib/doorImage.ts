import { prepareImage, removeImages, updateDoor, uploadImage } from './api';
import { pickImage } from './images';
import type { Door } from '@adventskalender/shared';

/** Foto auswählen, verkleinern (max. 1600 px), hochladen und dem Türchen zuordnen. */
export async function pickAndUploadDoorImage(userId: string, door: Door): Promise<Door | null> {
  const picked = await pickImage();
  if (!picked) return null;
  const prepared = await prepareImage(picked, { maxSide: 1600, format: 'jpeg', quality: 0.82 });
  const path = await uploadImage(userId, door.calendar_id, prepared);
  try {
    const updated = await updateDoor(door.calendar_id, door.day, { image_path: path });
    await removeImages([door.image_path]).catch(() => undefined);
    return updated;
  } catch (error) {
    await removeImages([path]).catch(() => undefined);
    throw error;
  }
}
