"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, MessageSquare, Send } from "lucide-react";
import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

interface CommentSectionProps {
  teamId: number;
  clipId: number | null;
  isCoach: boolean;
}

export const CommentSection = memo(function CommentSection({
  teamId,
  clipId,
  isCoach,
}: CommentSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentLevel, setCommentLevel] = useState<
    "all" | "coaches" | "private"
  >("coaches");
  const [targetUserId, setTargetUserId] = useState<number | undefined>();

  const trpc = useTRPC();

  const { data: comments, refetch: refetchComments } = useQuery(
    trpc.comments.byClip.queryOptions(
      {
        teamId,
        clipId: clipId ?? 0,
      },
      {
        enabled: clipId !== null,
      },
    ),
  );

  const { data: playerUsers } = useQuery(
    trpc.comments.playerUsers.queryOptions(
      {
        teamId,
      },
      {
        enabled: isCoach && clipId !== null,
      },
    ),
  );

  const addComment = useMutation(
    trpc.comments.add.mutationOptions({
      onSuccess: () => {
        setCommentText("");
        setCommentLevel("coaches");
        setTargetUserId(undefined);
        refetchComments();
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipId || !commentText.trim() || !isCoach) return;
    if (commentLevel === "private" && !targetUserId) return;

    addComment.mutate({
      teamId,
      clipId,
      body: commentText.trim(),
      level: commentLevel,
      targetUserId,
    });
  };

  if (!clipId) {
    return null;
  }

  const visibleCommentCount = comments?.length ?? 0;

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="shrink-0 gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        {visibleCommentCount > 0 && (
          <span className="text-xs font-medium">{visibleCommentCount}</span>
        )}
        <span className="sr-only">Show Comments</span>
      </Button>
    );
  }

  return (
    <Card className="w-full md:w-80 shrink-0 overflow-hidden">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Comments</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsOpen(false)}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Hide comments</span>
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {comment.author.firstName && comment.author.lastName
                        ? `${comment.author.firstName} ${comment.author.lastName}`
                        : comment.author.email}
                    </span>
                    <Badge
                      variant={
                        comment.level === "all"
                          ? "default"
                          : comment.level === "coaches"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {comment.level === "private" && comment.targetUser
                        ? `Private (${comment.targetUser.firstName || comment.targetUser.email})`
                        : comment.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
          </div>
        </ScrollArea>

        {isCoach && (
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] resize-none"
              />

              <div className="flex items-center justify-between gap-2">
                <Select
                  value={commentLevel}
                  onValueChange={(value: "all" | "coaches" | "private") => {
                    setCommentLevel(value);
                    if (value !== "private") {
                      setTargetUserId(undefined);
                    }
                  }}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coaches">Coaches</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !commentText.trim() ||
                    addComment.isPending ||
                    (commentLevel === "private" && !targetUserId)
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>

              {commentLevel === "private" && (
                <Select
                  value={targetUserId?.toString()}
                  onValueChange={(value) => setTargetUserId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {playerUsers?.map((player) => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </form>
          </div>
        )}
      </div>
    </Card>
  );
});
