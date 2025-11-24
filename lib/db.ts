export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
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

const DB_NAME = 'draw-db';
const STORE_NAME = 'boards';
const FOLDER_STORE_NAME = 'folders';
const DB_VERSION = 2;

export const initDB = (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined') return Promise.reject('No window');
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // Create boards store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('folderId', 'folderId', { unique: false });
      } else if (oldVersion < 2) {
        // Add folderId index to existing boards store
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('folderId')) {
            store.createIndex('folderId', 'folderId', { unique: false });
          }
        }
      }

      // Create folders store if it doesn't exist
      if (!db.objectStoreNames.contains(FOLDER_STORE_NAME)) {
        const folderStore = db.createObjectStore(FOLDER_STORE_NAME, { keyPath: 'id' });
        folderStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
};

export const saveBoard = async (board: Board): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(board);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getBoard = async (id: string): Promise<Board | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const getAllBoards = async (): Promise<Board[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev'); // Sort by updatedAt desc
    const results: Board[] = [];
    
    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
};

export const getBoardsPaginated = async (limit: number, offset: number): Promise<Board[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev'); // Sort by updatedAt desc
    const results: Board[] = [];
    let skipped = 0;
    let collected = 0;
    
    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        if (skipped < offset) {
          skipped++;
          cursor.continue();
        } else if (collected < limit) {
          results.push(cursor.value);
          collected++;
          cursor.continue();
        } else {
          resolve(results);
        }
      } else {
        resolve(results);
      }
    };
  });
};

export const deleteBoard = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

export const moveBoardToFolder = async (boardId: string, folderId: string | null): Promise<void> => {
    const db = await initDB();
    const board = await getBoard(boardId);
    if (!board) throw new Error('Board not found');
    
    board.folderId = folderId;
    board.updatedAt = Date.now();
    await saveBoard(board);
}

// Folder operations
export const saveFolder = async (folder: Folder): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FOLDER_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(FOLDER_STORE_NAME);
        const request = store.put(folder);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const getFolder = async (id: string): Promise<Folder | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FOLDER_STORE_NAME, 'readonly');
        const store = transaction.objectStore(FOLDER_STORE_NAME);
        const request = store.get(id);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const getAllFolders = async (): Promise<Folder[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FOLDER_STORE_NAME, 'readonly');
        const store = transaction.objectStore(FOLDER_STORE_NAME);
        const index = store.index('updatedAt');
        const request = index.openCursor(null, 'prev');
        const results: Folder[] = [];
        
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
    });
};

export const deleteFolder = async (id: string): Promise<void> => {
    const db = await initDB();
    
    // First, move all boards in this folder to root (null)
    const boards = await getAllBoards();
    const boardsInFolder = boards.filter(board => board.folderId === id);
    
    for (const board of boardsInFolder) {
        await moveBoardToFolder(board.id, null);
    }
    
    // Then delete the folder
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FOLDER_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(FOLDER_STORE_NAME);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const getBoardsByFolder = async (folderId: string | null): Promise<Board[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('folderId');
        const request = index.openCursor(IDBKeyRange.only(folderId), 'prev');
        const results: Board[] = [];
        
        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
    });
};