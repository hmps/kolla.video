import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-8">
      <h1 className="text-4xl font-bold">VUDL</h1>
      <p className="text-muted-foreground">
        Video upload and distribution platform for sports teams
      </p>
      <SignInButton mode="modal">
        <Button size="lg">Sign In</Button>
      </SignInButton>
    </div>
  );
}
