// What may be uploaded to the bucket (phase 08 § 8.2, D-188): each allowed media type, the file
// extensions that name it, and its size cap. Pure. The API's `storage.ts` enforces it on
// `POST /api/files/upload-url`; the Console's Vault and the Week Builder read it to pick a file's type
// from its name and to say what a picker accepts.
//
// THE TYPE COMES FROM THE NAME, NOT FROM `File.type`. Browsers disagree about what to call a file:
// a `.md` is often `''`, a `.csv` on Windows is `application/vnd.ms-excel` and a `.zip` there is
// `application/x-zip-compressed`. The presigned PUT signs one exact `content-type` (storage.ts,
// decision 3), so the client sends the canonical type for the file's extension and the API checks the
// two agree.

/** § 8.2's cap for every type but video: 25 decimal MB (storage.ts says why decimal). */
export const MAX_FILE_BYTES = 25 * 1000 * 1000;

/** D-188: an mp4's cap, video only. */
export const MAX_VIDEO_BYTES = 500 * 1000 * 1000;

export const VIDEO_MP4 = 'video/mp4';

/** Each allowed type, in order: § 8.2's four, then D-188's video, spreadsheet and CSV. */
export const UPLOAD_POLICY = {
  'application/json': { ext: ['json'], max: MAX_FILE_BYTES },
  'application/pdf': { ext: ['pdf'], max: MAX_FILE_BYTES },
  'text/markdown': { ext: ['md', 'markdown'], max: MAX_FILE_BYTES },
  'application/zip': { ext: ['zip'], max: MAX_FILE_BYTES },
  'video/mp4': { ext: ['mp4'], max: MAX_VIDEO_BYTES },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: ['xlsx'], max: MAX_FILE_BYTES },
  'text/csv': { ext: ['csv'], max: MAX_FILE_BYTES },
} as const satisfies Record<string, { ext: readonly string[]; max: number }>;

export type UploadType = keyof typeof UPLOAD_POLICY;

export const UPLOAD_TYPES = Object.keys(UPLOAD_POLICY) as UploadType[];

export const isUploadType = (v: unknown): v is UploadType => typeof v === 'string' && Object.prototype.hasOwnProperty.call(UPLOAD_POLICY, v);

/** A file name's extension, lower case, without the dot; '' when it has none. */
export function extensionOf(name: string): string {
  const at = name.lastIndexOf('.');
  return at > 0 && at < name.length - 1 ? name.slice(at + 1).toLowerCase() : '';
}

/** The allowed type a file name's extension names, or null for one that isn't allowed. */
export function uploadTypeFor(name: string): UploadType | null {
  const ext = extensionOf(name);
  return UPLOAD_TYPES.find((t) => (UPLOAD_POLICY[t].ext as readonly string[]).includes(ext)) ?? null;
}

/** Whether a file name's extension is one that names `type`. */
export const nameMatchesType = (name: string, type: UploadType): boolean => (UPLOAD_POLICY[type].ext as readonly string[]).includes(extensionOf(name));

/** A file picker's `accept`: every allowed extension, or only mp4 for a video. */
export const uploadAccept = (videoOnly = false): string =>
  (videoOnly ? [VIDEO_MP4 as UploadType] : UPLOAD_TYPES).flatMap((t) => UPLOAD_POLICY[t].ext.map((e) => `.${e}`)).join(',');

/**
 * The shape of a key `POST /api/files/upload-url` mints (`storage.ts` › `uploadKey`):
 * `uploads/<YYYY>/<MM>/<token>.<ext>`. An action that saves a key checks it has this shape, so a row or
 * a block can only ever name an object the upload route wrote.
 */
export const UPLOAD_KEY = /^uploads\/\d{4}\/\d{2}\/[A-Za-z0-9][A-Za-z0-9-]{7,63}\.[a-z0-9]{2,8}$/;

export const isUploadKey = (key: unknown): key is string => typeof key === 'string' && UPLOAD_KEY.test(key);

/**
 * A file's size as the Vault's Size column shows it, in the seed's own style ("12 KB", "1.1 MB"):
 * decimal units, as the caps are; at least 1 KB; one decimal place for MB, dropped when it is 0.
 */
export function fileSizeLabel(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1).replace(/\.0$/, '')} MB`;
}
