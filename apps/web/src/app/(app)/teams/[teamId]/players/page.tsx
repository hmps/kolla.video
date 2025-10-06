"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTRPC } from "@/trpc/client";

export default function PlayersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const teamIdNum = Number.parseInt(teamId, 10);

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");

  const trpc = useTRPC();
  const { data: team } = useQuery(
    trpc.teams.get.queryOptions({ teamId: teamIdNum }),
  );
  const { data: players, refetch } = useQuery(
    trpc.players.list.queryOptions({
      teamId: teamIdNum,
    }),
  );

  const createPlayer = useMutation(
    trpc.players.create.mutationOptions({
      onSuccess: () => {
        setName("");
        setNumber("");
        setIsAdding(false);
        refetch();
      },
    }),
  );

  const deletePlayer = useMutation(
    trpc.players.delete.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createPlayer.mutate({
        teamId: teamIdNum,
        name: name.trim(),
        number: number ? Number.parseInt(number, 10) : undefined,
      });
    }
  };

  const isCoach = team?.role === "coach";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/teams">Teams</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/teams/${teamId}/events`}>
                    {team?.name || "Team"}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Roster</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2 px-4">
          {isCoach && !isAdding && (
            <Button onClick={() => setIsAdding(true)}>Add Player</Button>
          )}
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="container mx-auto max-w-4xl">
          {isAdding && isCoach && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Player</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Player name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="number">Number (optional)</Label>
                      <Input
                        id="number"
                        type="number"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Jersey number"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createPlayer.isPending}>
                      {createPlayer.isPending ? "Adding..." : "Add Player"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAdding(false);
                        setName("");
                        setNumber("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
              <CardDescription>{players?.length ?? 0} players</CardDescription>
            </CardHeader>
            <CardContent>
              {players && players.length > 0 ? (
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {player.number && `#${player.number} `}
                          {player.name}
                        </p>
                      </div>
                      {isCoach && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            deletePlayer.mutate({
                              teamId: teamIdNum,
                              playerId: player.id,
                            })
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No players yet. {isCoach && "Add some to get started."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
