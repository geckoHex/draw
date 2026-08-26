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

export interface Account {
  id: string;
  username: string;
}
