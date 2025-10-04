import { Button } from "@/components/ui/button";

export default async function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <h1 className="text-4xl font-bold">VUDL</h1>
      <p className="text-muted-foreground">Video upload and distribution platform</p>
      <div className="flex gap-4">
        <Button>Default Button</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  );
}
