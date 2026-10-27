export interface Creator {
  id: string;
  name: string;
  email: string;
}

export interface Calendar {
  id: string;
  owner_id: string;
  title: string;
  year: number;
  theme_id: string;
  custom_background_path: string | null;
  custom_door_path: string | null;
  share_token: string;
  created_at: string;
}

export interface Door {
  calendar_id: string;
  day: number;
  text: string | null;
  image_path: string | null;
}

export interface PublicDoor {
  day: number;
  unlocked: boolean;
  text: string | null;
  image_path: string | null;
}

/** Antwort der RPC `get_public_calendar`. Gesperrte Türchen enthalten keinen Inhalt. */
export interface PublicCalendar {
  title: string;
  year: number;
  theme_id: string;
  custom_background_path: string | null;
  custom_door_path: string | null;
  creator_name: string;
  doors: PublicDoor[];
}

export function doorHasContent(door: { text: string | null; image_path: string | null }): boolean {
  return Boolean(door.text?.trim()) || Boolean(door.image_path);
}
