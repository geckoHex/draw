export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  tool: "pen" | "eraser";
}

export interface Board {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  strokes: Stroke[];
  folderId: string | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
}

interface SettingRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

interface MetadataRecord {
  key: string;
  completedAt: number;
}

export interface ExportedDatabaseStore {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  records: Array<{
    key: IDBValidKey;
    value: unknown;
  }>;
}

export interface ExportedDatabase {
  application: "GeckoDraw";
  database: typeof DB_NAME;
  databaseVersion: number;
  exportVersion: 1;
  exportedAt: string;
  stores: ExportedDatabaseStore[];
}

export type ImportedDatabaseStore = Pick<ExportedDatabaseStore, "name" | "records">;

const DB_NAME = "GeckoDrawDB";
const DB_VERSION = 1;
const BOARD_STORE_NAME = "boards";
const FOLDER_STORE_NAME = "folders";
const SETTING_STORE_NAME = "settings";
const METADATA_STORE_NAME = "metadata";

const LEGACY_DB_NAME = "draw-db";
const LEGACY_MIGRATION_KEY = "legacy-storage-v1";
const LEGACY_SETTING_KEYS = [
  "draw.theme",
  "draw.dark-canvas",
  "draw.pen-smoothing",
  "draw.show-save-status",
] as const;

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(BOARD_STORE_NAME)) {
        const boards = database.createObjectStore(BOARD_STORE_NAME, { keyPath: "id" });
        boards.createIndex("updatedAt", "updatedAt", { unique: false });
        boards.createIndex("folderId", "folderId", { unique: false });
      }

      if (!database.objectStoreNames.contains(FOLDER_STORE_NAME)) {
        const folders = database.createObjectStore(FOLDER_STORE_NAME, { keyPath: "id" });
        folders.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!database.objectStoreNames.contains(SETTING_STORE_NAME)) {
        database.createObjectStore(SETTING_STORE_NAME, { keyPath: "key" });
      }

      if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
        database.createObjectStore(METADATA_STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function databaseExists(name: string): Promise<boolean | undefined> {
  if (!("databases" in indexedDB)) return undefined;

  try {
    const databases = await indexedDB.databases();
    return databases.some((database) => database.name === name);
  } catch {
    return undefined;
  }
}

async function readLegacyDatabase(): Promise<{ boards: Board[]; folders: Folder[] }> {
  if ((await databaseExists(LEGACY_DB_NAME)) === false) {
    return { boards: [], folders: [] };
  }

  return new Promise((resolve, reject) => {
    let wasCreated = false;
    const request = indexedDB.open(LEGACY_DB_NAME);

    request.onupgradeneeded = (event) => {
      wasCreated = event.oldVersion === 0;
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const legacyDatabase = request.result;

      if (wasCreated) {
        legacyDatabase.close();
        resolve({ boards: [], folders: [] });
        return;
      }

      try {
        const storeNames = [BOARD_STORE_NAME, FOLDER_STORE_NAME].filter((storeName) =>
          legacyDatabase.objectStoreNames.contains(storeName)
        );

        if (storeNames.length === 0) {
          resolve({ boards: [], folders: [] });
          return;
        }

        const transaction = legacyDatabase.transaction(storeNames, "readonly");
        const boards = storeNames.includes(BOARD_STORE_NAME)
          ? await requestResult<Board[]>(transaction.objectStore(BOARD_STORE_NAME).getAll())
          : [];
        const folders = storeNames.includes(FOLDER_STORE_NAME)
          ? await requestResult<Folder[]>(transaction.objectStore(FOLDER_STORE_NAME).getAll())
          : [];
        await transactionComplete(transaction);
        resolve({ boards, folders });
      } catch (error) {
        reject(error);
      } finally {
        legacyDatabase.close();
      }
    };
  });
}

function readLegacySettings(): SettingRecord[] {
  const records: SettingRecord[] = [];

  try {
    for (const key of LEGACY_SETTING_KEYS) {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue === null) continue;

      let value: unknown = storedValue;
      if (key === "draw.theme") {
        if (!(["system", "light", "dark"] as string[]).includes(storedValue)) continue;
      } else if (key === "draw.dark-canvas" || key === "draw.show-save-status") {
        value = storedValue === "true";
      } else if (key === "draw.pen-smoothing") {
        const parsedValue = Number(storedValue);
        if (!Number.isFinite(parsedValue)) continue;
        value = Math.min(10, Math.max(1, Math.round(parsedValue)));
      }

      records.push({ key, value, updatedAt: Date.now() });
    }
  } catch (error) {
    console.warn("Unable to read legacy GeckoDraw settings.", error);
  }

  return records;
}

function putIfMissing(store: IDBObjectStore, key: IDBValidKey, value: unknown) {
  const request = store.get(key);
  request.onsuccess = () => {
    if (request.result === undefined) store.put(value);
  };
}

async function importLegacyData(
  database: IDBDatabase,
  boards: Board[],
  folders: Folder[],
  settings: SettingRecord[]
) {
  const transaction = database.transaction(
    [BOARD_STORE_NAME, FOLDER_STORE_NAME, SETTING_STORE_NAME],
    "readwrite"
  );
  const boardStore = transaction.objectStore(BOARD_STORE_NAME);
  const folderStore = transaction.objectStore(FOLDER_STORE_NAME);
  const settingStore = transaction.objectStore(SETTING_STORE_NAME);

  for (const board of boards) {
    putIfMissing(boardStore, board.id, { ...board, folderId: board.folderId ?? null });
  }
  for (const folder of folders) putIfMissing(folderStore, folder.id, folder);
  for (const setting of settings) putIfMissing(settingStore, setting.key, setting);

  await transactionComplete(transaction);
}

function deleteLegacyDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function clearLegacySettings() {
  try {
    for (const key of LEGACY_SETTING_KEYS) window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("Unable to remove legacy GeckoDraw settings.", error);
  }
}

async function migrateLegacyStorage(database: IDBDatabase) {
  const metadataTransaction = database.transaction(METADATA_STORE_NAME, "readonly");
  const migration = await requestResult<MetadataRecord | undefined>(
    metadataTransaction.objectStore(METADATA_STORE_NAME).get(LEGACY_MIGRATION_KEY)
  );

  if (migration) return;

  const [{ boards, folders }, settings] = await Promise.all([
    readLegacyDatabase(),
    Promise.resolve(readLegacySettings()),
  ]);

  await importLegacyData(database, boards, folders, settings);
  clearLegacySettings();
  await deleteLegacyDatabase();

  const completionTransaction = database.transaction(METADATA_STORE_NAME, "readwrite");
  completionTransaction.objectStore(METADATA_STORE_NAME).put({
    key: LEGACY_MIGRATION_KEY,
    completedAt: Date.now(),
  } satisfies MetadataRecord);
  await transactionComplete(completionTransaction);
}

export function initDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("GeckoDrawDB is only available in the browser."));
  }

  databasePromise ??= openDatabase().then(async (database) => {
    await migrateLegacyStorage(database);
    return database;
  });

  return databasePromise;
}

export async function exportDatabase(): Promise<ExportedDatabase> {
  const database = await initDB();
  const storeNames = Array.from(database.objectStoreNames);
  const transaction = database.transaction(storeNames, "readonly");
  const completion = transactionComplete(transaction);

  const stores = await Promise.all(
    storeNames.map(async (name): Promise<ExportedDatabaseStore> => {
      const store = transaction.objectStore(name);
      const [keys, values] = await Promise.all([
        requestResult<IDBValidKey[]>(store.getAllKeys()),
        requestResult<unknown[]>(store.getAll()),
      ]);

      return {
        name,
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement,
        records: values.map((value, index) => ({ key: keys[index], value })),
      };
    })
  );

  await completion;

  return {
    application: "GeckoDraw",
    database: DB_NAME,
    databaseVersion: database.version,
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    stores,
  };
}

export async function replaceDatabase(stores: ImportedDatabaseStore[]): Promise<void> {
  const database = await initDB();
  const currentStoreNames = Array.from(database.objectStoreNames);
  const unknownStore = stores.find((store) => !currentStoreNames.includes(store.name));

  if (unknownStore) {
    throw new Error(`The import contains an unsupported data store: ${unknownStore.name}`);
  }

  const transaction = database.transaction(currentStoreNames, "readwrite");
  const completion = transactionComplete(transaction);

  try {
    for (const storeName of currentStoreNames) {
      transaction.objectStore(storeName).clear();
    }

    for (const importedStore of stores) {
      const store = transaction.objectStore(importedStore.name);

      for (const record of importedStore.records) {
        if (store.keyPath === null) {
          store.put(record.value, record.key);
        } else {
          store.put(record.value);
        }
      }
    }
  } catch (error) {
    transaction.abort();
    await completion.catch(() => undefined);
    throw error;
  }

  await completion;
}

export async function getSettingValue<T>(key: string): Promise<T | undefined> {
  const database = await initDB();
  const transaction = database.transaction(SETTING_STORE_NAME, "readonly");
  const record = await requestResult<SettingRecord | undefined>(
    transaction.objectStore(SETTING_STORE_NAME).get(key)
  );
  return record?.value as T | undefined;
}

export async function saveSettingValue<T>(key: string, value: T): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction(SETTING_STORE_NAME, "readwrite");
  transaction.objectStore(SETTING_STORE_NAME).put({ key, value, updatedAt: Date.now() });
  await transactionComplete(transaction);
}

export async function saveBoard(board: Board): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction(BOARD_STORE_NAME, "readwrite");
  transaction.objectStore(BOARD_STORE_NAME).put(board);
  await transactionComplete(transaction);
}

export async function getBoard(id: string): Promise<Board | undefined> {
  const database = await initDB();
  const transaction = database.transaction(BOARD_STORE_NAME, "readonly");
  return requestResult<Board | undefined>(transaction.objectStore(BOARD_STORE_NAME).get(id));
}

export async function getAllBoards(): Promise<Board[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(BOARD_STORE_NAME, "readonly");
    const request = transaction.objectStore(BOARD_STORE_NAME).index("updatedAt").openCursor(null, "prev");
    const results: Board[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(results);
        return;
      }

      results.push(cursor.value);
      cursor.continue();
    };
  });
}

export async function getRootBoardsPaginated(limit: number, offset: number): Promise<Board[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(BOARD_STORE_NAME, "readonly");
    const request = transaction.objectStore(BOARD_STORE_NAME).index("updatedAt").openCursor(null, "prev");
    const results: Board[] = [];
    let skipped = 0;

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || results.length >= limit) {
        resolve(results);
        return;
      }

      const board = cursor.value as Board;
      if (board.folderId != null) {
        cursor.continue();
      } else if (skipped < offset) {
        skipped += 1;
        cursor.continue();
      } else {
        results.push(board);
        cursor.continue();
      }
    };
  });
}

export async function getFolderBoardCounts(): Promise<Record<string, number>> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(BOARD_STORE_NAME, "readonly");
    const request = transaction.objectStore(BOARD_STORE_NAME).openCursor();
    const counts: Record<string, number> = {};

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(counts);
        return;
      }

      const folderId = (cursor.value as Board).folderId;
      if (folderId) counts[folderId] = (counts[folderId] ?? 0) + 1;
      cursor.continue();
    };
  });
}

export async function deleteBoard(id: string): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction(BOARD_STORE_NAME, "readwrite");
  transaction.objectStore(BOARD_STORE_NAME).delete(id);
  await transactionComplete(transaction);
}

export async function renameBoard(boardId: string, newTitle: string): Promise<void> {
  const board = await getBoard(boardId);
  if (!board) throw new Error("Board not found");

  board.title = newTitle;
  board.updatedAt = Date.now();
  await saveBoard(board);
}

export async function moveBoardToFolder(boardId: string, folderId: string | null): Promise<void> {
  const board = await getBoard(boardId);
  if (!board) throw new Error("Board not found");

  board.folderId = folderId;
  board.updatedAt = Date.now();
  await saveBoard(board);
}

export async function saveFolder(folder: Folder): Promise<void> {
  const database = await initDB();
  const transaction = database.transaction(FOLDER_STORE_NAME, "readwrite");
  transaction.objectStore(FOLDER_STORE_NAME).put(folder);
  await transactionComplete(transaction);
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  const database = await initDB();
  const transaction = database.transaction(FOLDER_STORE_NAME, "readonly");
  return requestResult<Folder | undefined>(transaction.objectStore(FOLDER_STORE_NAME).get(id));
}

export async function getAllFolders(): Promise<Folder[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FOLDER_STORE_NAME, "readonly");
    const request = transaction.objectStore(FOLDER_STORE_NAME).index("updatedAt").openCursor(null, "prev");
    const results: Folder[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(results);
        return;
      }

      results.push(cursor.value);
      cursor.continue();
    };
  });
}

export async function deleteFolder(id: string): Promise<void> {
  const database = await initDB();
  const boards = (await getAllBoards()).filter((board) => board.folderId === id);
  const transaction = database.transaction([BOARD_STORE_NAME, FOLDER_STORE_NAME], "readwrite");
  const boardStore = transaction.objectStore(BOARD_STORE_NAME);

  for (const board of boards) {
    boardStore.put({ ...board, folderId: null, updatedAt: Date.now() });
  }
  transaction.objectStore(FOLDER_STORE_NAME).delete(id);
  await transactionComplete(transaction);
}

export async function getBoardsByFolder(folderId: string): Promise<Board[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(BOARD_STORE_NAME, "readonly");
    const request = transaction
      .objectStore(BOARD_STORE_NAME)
      .index("folderId")
      .openCursor(IDBKeyRange.only(folderId), "prev");
    const results: Board[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        results.sort((left, right) => right.updatedAt - left.updatedAt);
        resolve(results);
        return;
      }

      results.push(cursor.value);
      cursor.continue();
    };
  });
}
