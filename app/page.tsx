"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllBoards, deleteBoard, type Board } from "@/lib/db";
import { BoardPreview } from "@/components/board-preview";

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  useEffect(() => {
    getAllBoards().then(setBoards);
    
    // Update relative time every minute
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const createNewBoard = () => {
    const id = crypto.randomUUID();
    router.push(`/board/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this board?")) {
      await deleteBoard(id);
      const loadedBoards = await getAllBoards();
      setBoards(loadedBoards);
    }
  };

  const timeAgo = (timestamp: number) => {
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
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Boards</h1>
          <Button onClick={createNewBoard} size="lg" className="rounded-full px-6">
            <Plus className="mr-2 h-5 w-5" />
            New Board
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Board Cards */}
          {boards.map((board) => (
            <div
              key={board.id}
              className="group relative flex flex-col p-5 h-80 w-full border-2 border-black rounded-[32px] bg-white hover:shadow-xl transition-all cursor-pointer"
              onClick={() => router.push(`/board/${board.id}`)}
            >
              <div className="flex justify-between items-start mb-4 px-1">
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <h3 className="text-xl font-medium truncate" title={board.title || "Untitled Board"}>
                    {board.title || "Untitled Board"}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {timeAgo(board.updatedAt)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mr-2 -mt-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(e, board.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 relative border border-black rounded-[24px] overflow-hidden bg-white">
                <BoardPreview strokes={board.strokes} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>
            </div>
          ))}
        </div>
        
        {boards.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
                No boards yet. Create one to get started!
            </div>
        )}
      </div>
    </main>
  );
}
