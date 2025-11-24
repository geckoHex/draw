import { Whiteboard } from "@/components/whiteboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <main className="h-screen w-screen overflow-hidden">
      <Whiteboard boardId={id} />
    </main>
  );
}