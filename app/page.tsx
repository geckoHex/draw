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
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Boards</h1>
          <Button onClick={createNewBoard} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Board
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-dashed border-2 flex flex-col items-center justify-center min-h-[200px] bg-gray-50/50"
            onClick={createNewBoard}
          >
            <div className="flex flex-col items-center text-muted-foreground">
              <Plus className="h-12 w-12 mb-2" />
              <span className="font-medium">Create New Board</span>
            </div>
          </Card>

          {/* Board Cards */}
          {boards.map((board) => (
            <Card 
              key={board.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
              onClick={() => router.push(`/board/${board.id}`)}
            >
              <CardHeader>
                <CardTitle className="truncate">{board.title || "Untitled Board"}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                  <BoardPreview strokes={board.strokes} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatDate(board.updatedAt)}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, board.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
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
