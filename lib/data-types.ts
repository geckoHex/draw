export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  type?: "stroke";
  points: Point[];
  color: string;
  size: number;
  tool: "pen" | "eraser";
}

export interface CanvasImage {
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export type CanvasElement = Stroke | CanvasImage;

export interface Board {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  strokes: CanvasElement[];
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
  isRoot: boolean;
}

export interface AdminAccount extends Account {
  createdAt: number;
  updatedAt: number;
}
