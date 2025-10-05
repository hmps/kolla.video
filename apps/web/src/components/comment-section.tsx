"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

interface CommentSectionProps {
  teamId: number;
  clipId: number | null;
  isCoach: boolean;
}

export function CommentSection({
  teamId,
  clipId,
  isCoach,
}: CommentSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [commentText, setCommentText] = useState("");

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

  const addComment = useMutation(
    trpc.comments.add.mutationOptions({
      onSuccess: () => {
        setCommentText("");
        refetchComments();
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipId || !commentText.trim() || !isCoach) return;

    addComment.mutate({
      teamId,
      clipId,
      body: commentText.trim(),
    });
  };

  if (!clipId) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="shrink-0"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="sr-only">Show Comments</span>
      </Button>
    );
  }

  return (
    <Card className="w-80 shrink-0 overflow-hidden">
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">
                      {comment.author.email}
                    </span>
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
            <form onSubmit={handleSubmit} className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || addComment.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Card>
  );
}
