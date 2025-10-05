"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";
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
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/teams/${teamId}/events`}
          className="text-sm text-muted-foreground mb-2 block"
        >
          ← Back to Events
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Team Roster</h1>
          {isCoach && !isAdding && (
            <Button onClick={() => setIsAdding(true)}>Add Player</Button>
          )}
        </div>
      </div>

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
  );
}
