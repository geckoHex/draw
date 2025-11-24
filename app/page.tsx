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
  const router = useRouter();

  useEffect(() => {
    getAllBoards().then(setBoards);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Boards</h1>
          <Button onClick={createNewBoard}>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Create New Card */}
          <Card
            className="cursor-pointer hover:shadow-md transition-all border-dashed border-2 flex flex-col items-center justify-center aspect-[4/3] bg-gray-50/50 hover:bg-gray-100/50"
            onClick={createNewBoard}
          >
            <div className="flex flex-col items-center text-muted-foreground">
              <Plus className="h-8 w-8 mb-2" />
              <span className="font-medium text-sm">Create New</span>
            </div>
          </Card>

          {/* Board Cards */}
          {boards.map((board) => (
            <Card
              key={board.id}
              className="cursor-pointer hover:shadow-md transition-all flex flex-col overflow-hidden group"
              onClick={() => router.push(`/board/${board.id}`)}
            >
              <div className="relative aspect-[4/3] bg-gray-100">
                <BoardPreview strokes={board.strokes} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>
              <div className="p-3 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-medium text-sm truncate flex-1" title={board.title || "Untitled Board"}>
                    {board.title || "Untitled Board"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, board.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatDate(board.updatedAt)}
                </div>
              </div>
            </Card>
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
