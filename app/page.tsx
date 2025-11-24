"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Search, X, FolderPlus, MoreVertical, Edit2, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RenameBoardModal } from "@/components/rename-board-modal";
import { FolderPickerModal } from "@/components/folder-picker-modal";
import {
  getBoardsPaginated,
  deleteBoard,
  renameBoard,
  getAllFolders,
  saveFolder,
  deleteFolder,
  moveBoardToFolder,
  getBoardsByFolder,
  type Board,
  type Folder
} from "@/lib/db";
import { BoardPreview } from "@/components/board-preview";
import { FolderCard } from "@/components/folder-card";
import { FolderModal } from "@/components/folder-modal";

const BOARDS_PER_PAGE = 20;

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [filteredBoards, setFilteredBoards] = useState<Board[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; title: string } | null>(null);
  const [boardToRename, setBoardToRename] = useState<{ id: string; title: string } | null>(null);
  const [boardToMove, setBoardToMove] = useState<{ id: string; folderId: string | null } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [draggedBoardId, setDraggedBoardId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const router = useRouter();

  const loadMoreBoards = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      const newBoards = await getBoardsPaginated(BOARDS_PER_PAGE, offset);
      if (newBoards.length < BOARDS_PER_PAGE) {
        setHasMore(false);
      }
      setBoards(prev => [...prev, ...newBoards]);
      setOffset(prev => prev + newBoards.length);
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset, isLoading, hasMore]);

  const timeAgo = useCallback((timestamp: number) => {
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    return `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? '' : 's'} ago`;
  }, [now]);

  // Filter boards and folders based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBoards(boards);
      setFilteredFolders(folders);
      return;
    }

    const query = searchQuery.toLowerCase();
    
    // Filter boards
    const filteredBoardsList = boards.filter(board => {
      // Search by title
      const titleMatch = board.title.toLowerCase().includes(query);
      
      // Search by date (format: "X days ago", "X hours ago", etc.)
      const dateString = timeAgo(board.updatedAt).toLowerCase();
      const dateMatch = dateString.includes(query);
      
      // Search by formatted date
      const formattedDate = new Date(board.updatedAt).toLocaleDateString().toLowerCase();
      const formattedDateMatch = formattedDate.includes(query);
      
      // Search by folder name
      const boardFolder = board.folderId ? folders.find(f => f.id === board.folderId) : null;
      const folderMatch = boardFolder ? boardFolder.name.toLowerCase().includes(query) : false;
      
      return titleMatch || dateMatch || formattedDateMatch || folderMatch;
    });
    
    // Filter folders
    const filteredFoldersList = folders.filter(folder =>
      folder.name.toLowerCase().includes(query)
    );
    
    setFilteredBoards(filteredBoardsList);
    setFilteredFolders(filteredFoldersList);
  }, [searchQuery, boards, folders, now, timeAgo]);

  const loadFolders = useCallback(async () => {
    try {
      const loadedFolders = await getAllFolders();
      setFolders(loadedFolders);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        const [newBoards, loadedFolders] = await Promise.all([
          getBoardsPaginated(BOARDS_PER_PAGE, 0),
          getAllFolders()
        ]);
        
        setBoards(newBoards);
        setFolders(loadedFolders);
        setOffset(newBoards.length);
        setHasMore(newBoards.length >= BOARDS_PER_PAGE);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    // Update relative time every minute
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreBoards();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMoreBoards]);

  const createNewBoard = () => {
    const id = crypto.randomUUID();
    router.push(`/board/${id}`);
  };

  const handleRenameBoard = async (newTitle: string) => {
    if (boardToRename) {
      await renameBoard(boardToRename.id, newTitle);
      setBoards(prev => prev.map(board =>
        board.id === boardToRename.id
          ? { ...board, title: newTitle, updatedAt: Date.now() }
          : board
      ));
      setBoardToRename(null);
    }
  };

  const handleMoveBoard = async (folderId: string | null) => {
    if (boardToMove) {
      await moveBoardToFolder(boardToMove.id, folderId);
      // If we're in a folder view, remove the board from the list
      if (selectedFolderId) {
        setBoards(prev => prev.filter(board => board.id !== boardToMove.id));
      } else {
        // Update the board's folderId in the list
        setBoards(prev => prev.map(board =>
          board.id === boardToMove.id
            ? { ...board, folderId, updatedAt: Date.now() }
            : board
        ));
      }
      setBoardToMove(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (boardToDelete) {
      await deleteBoard(boardToDelete.id);
      setBoards(prev => prev.filter(board => board.id !== boardToDelete.id));
      setBoardToDelete(null);
    }
  };

  const handleDeleteFolderConfirm = async () => {
    if (folderToDelete) {
      await deleteFolder(folderToDelete.id);
      setFolders(prev => prev.filter(folder => folder.id !== folderToDelete.id));
      if (selectedFolderId === folderToDelete.id) {
        setSelectedFolderId(null);
      }
      setFolderToDelete(null);
      // Reload boards as they may have been moved out of the folder
      setBoards([]);
      setOffset(0);
      setHasMore(true);
      loadMoreBoards();
    }
  };

  const handleCreateFolder = async (name: string, color: string) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveFolder(newFolder);
    await loadFolders();
  };

  const handleEditFolder = async (name: string, color: string) => {
    if (editingFolder) {
      const updatedFolder: Folder = {
        ...editingFolder,
        name,
        color,
        updatedAt: Date.now(),
      };
      await saveFolder(updatedFolder);
      await loadFolders();
      setEditingFolder(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, boardId: string) => {
    setDraggedBoardId(boardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (draggedBoardId) {
      await moveBoardToFolder(draggedBoardId, folderId);
      setBoards(prev => prev.filter(board => board.id !== draggedBoardId));
      setDraggedBoardId(null);
    }
  };

  const handleDropOnRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBoardId && selectedFolderId) {
      await moveBoardToFolder(draggedBoardId, null);
      setBoards(prev => prev.filter(board => board.id !== draggedBoardId));
      setDraggedBoardId(null);
    }
  };

  const handleFolderClick = async (folderId: string) => {
    setSelectedFolderId(folderId);
    setSearchQuery("");
    setIsLoading(true);
    try {
      const folderBoards = await getBoardsByFolder(folderId);
      setBoards(folderBoards);
      setHasMore(false); // No pagination in folder view
    } catch (error) {
      console.error('Failed to load folder boards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToRoot = () => {
    setSelectedFolderId(null);
    setBoards([]);
    setOffset(0);
    setHasMore(true);
    loadMoreBoards();
  };

  const getBoardCountForFolder = (folderId: string) => {
    return boards.filter(board => board.folderId === folderId).length;
  };

  // Show nothing while initial data is loading
  if (initialLoading) {
    return (
      <main className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-8 md:p-12 relative overflow-hidden">
        {/* Static background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl" />
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-8 md:p-12 relative overflow-hidden">
      {/* Static background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent tracking-tight">
                {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'My Boards'}
              </h1>
              <p className="text-sm text-gray-600">
                {boards.length === 0 ? 'Start creating your first board' : `${boards.length} board${boards.length === 1 ? '' : 's'}${searchQuery ? ` • ${filteredBoards.length} board${filteredBoards.length === 1 ? '' : 's'}, ${filteredFolders.length} folder${filteredFolders.length === 1 ? '' : 's'}` : ''}`}
              </p>
            </div>
            <div className="flex gap-3">
              {selectedFolderId && (
                <Button
                  onClick={handleBackToRoot}
                  variant="outline"
                  size="lg"
                  className="rounded-2xl px-6"
                >
                  Back to All Boards
                </Button>
              )}
              {!selectedFolderId && (
                <Button
                  onClick={() => setShowFolderModal(true)}
                  variant="outline"
                  size="lg"
                  className="rounded-2xl px-6"
                >
                  <FolderPlus className="mr-2 h-5 w-5" />
                  New Folder
                </Button>
              )}
              <Button
                onClick={createNewBoard}
                size="lg"
                className="rounded-2xl px-8 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 transition-all hover:scale-105 bg-linear-to-r from-gray-900 to-gray-800"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Board
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {boards.length > 0 && (
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search boards by name or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-10 h-12 rounded-2xl border-gray-200 focus:border-gray-300 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Folders Grid - Only show in root view */}
        {!selectedFolderId && filteredFolders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {searchQuery ? `Folders (${filteredFolders.length})` : 'Folders'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  id={folder.id}
                  name={folder.name}
                  color={folder.color}
                  boardCount={getBoardCountForFolder(folder.id)}
                  onClick={() => handleFolderClick(folder.id)}
                  onDelete={() => setFolderToDelete({ id: folder.id, name: folder.name })}
                  onRename={() => setEditingFolder(folder)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnFolder(e, folder.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Boards Grid */}
        {filteredBoards.length > 0 ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropOnRoot}
          >
            {!selectedFolderId && (
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {searchQuery ? `Boards (${filteredBoards.length})` : 'All Boards'}
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredBoards.map((board) => {
                const boardFolder = board.folderId ? folders.find(f => f.id === board.folderId) : null;
                return (
                  <div
                    key={board.id}
                    draggable={!selectedFolderId}
                    onDragStart={(e) => handleDragStart(e, board.id)}
                    className="group relative flex flex-col p-6 h-[280px] w-full rounded-3xl bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer"
                    onClick={() => router.push(`/board/${board.id}`)}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-2 max-w-[75%]">
                        <h3 className="text-lg font-semibold text-gray-900 truncate leading-tight" title={board.title || "Untitled Board"}>
                          {board.title || "Untitled Board"}
                        </h3>
                        <span className="text-xs text-gray-500 font-medium">
                          {timeAgo(board.updatedAt)}
                        </span>
                        {boardFolder && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium w-fit"
                            style={{
                              backgroundColor: `${boardFolder.color}15`,
                              color: boardFolder.color
                            }}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                            {boardFolder.name}
                          </span>
                        )}
                      </div>
                      <DropdownMenu
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          icon={<Edit2 className="h-4 w-4" />}
                          onClick={(e) => {
                            e.stopPropagation()
                            setBoardToRename({ id: board.id, title: board.title })
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          icon={<FolderInput className="h-4 w-4" />}
                          onClick={(e) => {
                            e.stopPropagation()
                            setBoardToMove({ id: board.id, folderId: board.folderId })
                          }}
                        >
                          Move to Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          icon={<Trash2 className="h-4 w-4" />}
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setBoardToDelete({ id: board.id, title: board.title })
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenu>
                </div>
                
                {/* Preview Container */}
                <div className="flex-1 relative rounded-2xl overflow-hidden bg-white border border-gray-100 min-h-0">
                  <BoardPreview strokes={board.strokes} />
                </div>
                </div>
              );
            })}
            </div>
          </div>
        ) : (boards.length > 0 || folders.length > 0) && searchQuery ? (
          /* No Search Results */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-center space-y-3">
              <Search className="h-12 w-12 text-gray-300 mx-auto" />
              <h3 className="text-xl font-semibold text-gray-900">No results found</h3>
              <p className="text-gray-600 max-w-sm">
                No boards or folders match &ldquo;{searchQuery}&rdquo;. Try a different search term.
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="mt-4 rounded-xl"
              >
                Clear Search
              </Button>
            </div>
          </div>
        ) : null}

        {/* Loading indicator */}
        {isLoading && boards.length > 0 && !searchQuery && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Intersection observer target - only when not searching */}
        {!searchQuery && <div ref={observerTarget} className="h-4" />}

        {/* Empty State */}
        {boards.length === 0 && (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-full" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl shadow-black/10 border border-gray-200/50">
                <div className="flex flex-col items-center gap-6 text-center max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                    <Plus className="w-10 h-10 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">No boards yet</h3>
                    <p className="text-gray-600">
                      Create your first board to start drawing and collaborating
                    </p>
                  </div>
                  <Button
                    onClick={createNewBoard}
                    size="lg"
                    className="rounded-2xl px-8 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 transition-all hover:scale-105 bg-linear-to-r from-gray-900 to-gray-800"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Board
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={boardToDelete !== null}
        onClose={() => setBoardToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Board?"
        description={`Are you sure you want to delete "${boardToDelete?.title || 'this board'}"? This action cannot be undone and all drawings will be permanently lost.`}
        confirmText="Delete Board"
        cancelText="Cancel"
        variant="destructive"
      />

      <ConfirmModal
        isOpen={folderToDelete !== null}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleDeleteFolderConfirm}
        title="Delete Folder?"
        description={`Are you sure you want to delete "${folderToDelete?.name || 'this folder'}"? All boards in this folder will be moved to the root. This action cannot be undone.`}
        confirmText="Delete Folder"
        cancelText="Cancel"
        variant="destructive"
      />

      <FolderModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSave={handleCreateFolder}
        title="Create New Folder"
      />

      <FolderModal
        isOpen={editingFolder !== null}
        onClose={() => setEditingFolder(null)}
        onSave={handleEditFolder}
        initialName={editingFolder?.name}
        initialColor={editingFolder?.color}
        title="Edit Folder"
      />

      <RenameBoardModal
        isOpen={boardToRename !== null}
        onClose={() => setBoardToRename(null)}
        onSave={handleRenameBoard}
        initialName={boardToRename?.title || ""}
      />

      <FolderPickerModal
        isOpen={boardToMove !== null}
        onClose={() => setBoardToMove(null)}
        onSelect={handleMoveBoard}
        folders={folders}
        currentFolderId={boardToMove?.folderId || null}
      />
    </main>
  );
}
