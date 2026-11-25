import { z } from 'zod';

const DB_NAME = 'smart-clinic-crypto';
const STORE_NAME = 'keys';
const KEY_NAME = 'smart-clinic-master-key';

const encryptedDataSchema = z.object({
  iv: z.string(),
  data: z.string(),
});

type EncryptedData = z.infer<typeof encryptedDataSchema>;

const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCodePoint(bytes.at(i) ?? 0);
  }

  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }

  return bytes.buffer;
};

const awaitIdbRequest = async <T>(request: IDBRequest<T>): Promise<T> =>
  // oxlint-disable-next-line promise/avoid-new -- IndexedDB exposes EventTarget callbacks instead of Promises
  await new Promise<T>((resolve, reject) => {
    request.addEventListener(
      'success',
      () => {
        resolve(request.result);
      },
      { once: true },
    );

    request.addEventListener(
      'error',
      () => {
        reject(request.error ?? new Error('IndexedDB request failed'));
      },
      { once: true },
    );
  });

const openDB = async (): Promise<IDBDatabase> => {
  const request = indexedDB.open(DB_NAME, 1);

  request.addEventListener(
    'upgradeneeded',
    () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
    { once: true },
  );

  return await awaitIdbRequest(request);
};

const getFromStore = async (
  db: IDBDatabase,
  key: string,
): Promise<Uint8Array | undefined> => {
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  // SAFETY: IDBObjectStore.get returns IDBRequest<any>; this key stores Uint8Array or undefined.
  const request = store.get(key) as IDBRequest<unknown>;
  const result = await awaitIdbRequest(request);

  if (result === undefined) {
    return undefined;
  }

  if (ArrayBuffer.isView(result)) {
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
  }

  return undefined;
};

const putToStore = async (
  db: IDBDatabase,
  key: string,
  value: Uint8Array,
): Promise<void> => {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const request = store.put(value, key);

  await awaitIdbRequest(request);
};

const getOrCreateMasterKey = async (): Promise<CryptoKey> => {
  const db = await openDB();
  const stored = await getFromStore(db, KEY_NAME);

  if (stored !== undefined) {
    return await crypto.subtle.importKey(
      'raw',
      new Uint8Array(stored).buffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  await putToStore(db, KEY_NAME, new Uint8Array(exported));

  return key;
};

export async function encryptText(plaintext: string): Promise<string> {
  const key = await getOrCreateMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  const combined: EncryptedData = {
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(ciphertext),
  };

  return JSON.stringify(combined);
}

export async function decryptText(encrypted: string): Promise<string> {
  const key = await getOrCreateMasterKey();
  const parsed = encryptedDataSchema.parse(JSON.parse(encrypted));
  const iv = base64ToArrayBuffer(parsed.iv);
  const ciphertext = base64ToArrayBuffer(parsed.data);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
