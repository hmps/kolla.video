"use client";

import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";

export default function DashboardPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: user, isLoading: userLoading } = useQuery(
    trpc.auth.getMe.queryOptions(),
  );
  const { data: teams, isLoading: teamsLoading } = useQuery(
    trpc.teams.list.queryOptions(),
  );
  const syncUser = useMutation(trpc.auth.syncUser.mutationOptions());

  useEffect(() => {
    if (!userLoading && !user) {
      syncUser.mutate();
    }
  }, [user, userLoading, syncUser]);

  if (userLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <UserButton />
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Select a team or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            {teams && teams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <Card
                    key={team.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => router.push(`/teams/${team.id}/events`)}
                  >
                    <CardHeader>
                      <CardTitle>{team.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {team.role}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                You are not a member of any teams yet.
              </p>
            )}
            <div className="mt-4">
              <Link href="/teams/new">
                <Button>Create Team</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
