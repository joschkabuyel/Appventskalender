import {
  MAX_IMAGE_BYTES,
  MEDIA_BUCKET,
  type Calendar,
  type Creator,
  type Door,
  type DoorOrder,
} from '@adventskalender/shared';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

type Result<T> = { data: T; error: { message: string } | null };

/** Wirft bei Fehlern eine deutsche Meldung, sonst die (evtl. leeren) Daten. */
function unwrap<T>(result: Result<T>): T {
  if (result.error) throw new Error(translateError(result.error.message));
  return result.data;
}

/** Wie unwrap, erwartet aber Daten. */
function check<T>(result: Result<T>): NonNullable<T> {
  const data = unwrap(result);
  if (data == null) throw new Error('Nicht gefunden.');
  return data;
}

function translateError(message: string): string {
  if (/bereits geöffnet|Ungültige Reihenfolge|nicht gefunden/.test(message)) return message;
  if (/network|fetch/i.test(message)) return 'Keine Verbindung. Bitte prüfe deine Internetverbindung.';
  if (/exceeded the maximum allowed size|too large/i.test(message)) return 'Das Bild ist größer als 5 MB.';
  return `Etwas ist schiefgelaufen: ${message}`;
}

// ---- Profil ----

export async function getProfile(): Promise<Creator | null> {
  return unwrap(await supabase.from('creators').select('id, name, email').maybeSingle());
}

export async function saveProfile(userId: string, name: string, email: string): Promise<Creator> {
  return check(
    await supabase
      .from('creators')
      .upsert({ id: userId, name: name.trim(), email: email.trim().toLowerCase() })
      .select('id, name, email')
      .single(),
  );
}

// ---- Kalender ----

const CALENDAR_COLUMNS =
  'id, owner_id, title, year, theme_id, custom_background_path, custom_door_path, share_token, created_at';

export async function listCalendars(): Promise<Calendar[]> {
  return check(await supabase.from('calendars').select(CALENDAR_COLUMNS).order('created_at', { ascending: false }));
}

export async function getCalendar(id: string): Promise<Calendar> {
  return check(await supabase.from('calendars').select(CALENDAR_COLUMNS).eq('id', id).single());
}

export async function createCalendar(title: string): Promise<Calendar> {
  return check(await supabase.from('calendars').insert({ title: title.trim() }).select(CALENDAR_COLUMNS).single());
}

export async function updateCalendar(
  id: string,
  changes: Partial<Pick<Calendar, 'title' | 'theme_id' | 'custom_background_path' | 'custom_door_path'>>,
): Promise<Calendar> {
  return check(await supabase.from('calendars').update(changes).eq('id', id).select(CALENDAR_COLUMNS).single());
}

/** Löscht den Kalender samt aller hochgeladenen Bilder. Der geteilte Link funktioniert danach nicht mehr. */
export async function deleteCalendar(calendar: Calendar): Promise<void> {
  const folder = `${calendar.owner_id}/${calendar.id}`;
  const files = check(await supabase.storage.from(MEDIA_BUCKET).list(folder, { limit: 1000 }));
  if (files.length > 0) {
    unwrap(await supabase.storage.from(MEDIA_BUCKET).remove(files.map((file) => `${folder}/${file.name}`)));
  }
  unwrap(await supabase.from('calendars').delete().eq('id', calendar.id));
}

// ---- Türchen ----

export async function listDoors(calendarId: string): Promise<Door[]> {
  return check(
    await supabase.from('doors').select('calendar_id, day, text, image_path').eq('calendar_id', calendarId).order('day'),
  );
}

export async function updateDoor(
  calendarId: string,
  day: number,
  changes: Partial<Pick<Door, 'text' | 'image_path'>>,
): Promise<Door> {
  return check(
    await supabase
      .from('doors')
      .update(changes)
      .eq('calendar_id', calendarId)
      .eq('day', day)
      .select('calendar_id, day, text, image_path')
      .single(),
  );
}

export async function reorderDoors(calendarId: string, order: DoorOrder): Promise<void> {
  unwrap(await supabase.rpc('reorder_doors', { p_calendar_id: calendarId, p_order: order }));
}

// ---- Bilder ----

export function mediaUrl(path: string | null | undefined): string | null {
  return path ? supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  format: 'jpeg' | 'png';
}

/**
 * Verkleinert ein Bild, damit Uploads schnell bleiben. `maxSide` begrenzt die längere Kante.
 */
export async function prepareImage(
  source: { uri: string; width: number; height: number },
  options: { maxSide: number; format: 'jpeg' | 'png'; quality?: number },
): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(source.uri);
  const longest = Math.max(source.width, source.height);
  if (longest > options.maxSide) {
    context.resize(source.width >= source.height ? { width: options.maxSide } : { height: options.maxSide });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: options.format === 'png' ? SaveFormat.PNG : SaveFormat.JPEG,
    compress: options.quality ?? 0.82,
  });
  return { uri: saved.uri, width: saved.width, height: saved.height, format: options.format };
}

/**
 * Lädt ein Bild in den Ordner des Kalenders. Der Dateiname ist eine zufällige UUID, damit Bilder
 * noch gesperrter Türchen nicht erraten werden können.
 */
export async function uploadImage(userId: string, calendarId: string, image: PreparedImage): Promise<string> {
  const file = new File(image.uri);
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Das Bild ist größer als 5 MB.');
  const extension = image.format === 'png' ? 'png' : 'jpg';
  const path = `${userId}/${calendarId}/${randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();
  check(
    await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
      contentType: image.format === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    }),
  );
  return path;
}

/** Entfernt nicht mehr benötigte Bilder. Fehler hier sind unkritisch. */
export async function removeImages(paths: (string | null | undefined)[]): Promise<void> {
  const existing = paths.filter((path): path is string => Boolean(path));
  if (existing.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(existing);
}
