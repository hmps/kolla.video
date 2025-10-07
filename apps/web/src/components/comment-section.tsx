"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, MessageSquare, Send } from "lucide-react";
import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

interface CommentSectionProps {
  teamId: number;
  clipId: number | null;
  isCoach: boolean;
}

export interface CommentSectionRef {
  focusInput: () => void;
}

export const CommentSection = memo(
  forwardRef<CommentSectionRef, CommentSectionProps>(
    function CommentSection({ teamId, clipId, isCoach }, ref) {
      const [commentText, setCommentText] = useState("");
      const [commentLevel, setCommentLevel] = useState<
        "all" | "coaches" | "private"
      >("coaches");
      const [targetUserId, setTargetUserId] = useState<number | undefined>();
      const [shouldFocusOnOpen, setShouldFocusOnOpen] = useState(false);
      const textareaRef = useRef<HTMLTextAreaElement>(null);

      const trpc = useTRPC();

      // Detect and handle comment level commands
      useEffect(() => {
        const firstWord = commentText.trim().split(/\s+/)[0]?.toLowerCase();

        if (firstWord === "@all") {
          setCommentLevel("all");
        } else if (firstWord === "@coaches") {
          setCommentLevel("coaches");
        } else if (firstWord === "@private") {
          setCommentLevel("private");
        }
      }, [commentText]);

      const {
        data: comments,
        refetch: refetchComments,
        isLoading: isLoadingComments,
      } = useQuery(
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

      const [isOpen, setIsOpen] = useState(
        () => (comments && comments.length > 0) || false,
      );

      useEffect(() => {
        if (isOpen && shouldFocusOnOpen) {
          textareaRef.current?.focus();
          setShouldFocusOnOpen(false);
        }
      }, [isOpen, shouldFocusOnOpen]);

      useImperativeHandle(ref, () => ({
        focusInput: () => {
          if (!isOpen) {
            setIsOpen(true);
            setShouldFocusOnOpen(true);
          } else {
            textareaRef.current?.focus();
          }
        },
      }));

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

    // Remove command prefix if present
    let finalText = commentText.trim();
    const firstWord = finalText.split(/\s+/)[0]?.toLowerCase();

    if (firstWord === "@all" || firstWord === "@coaches" || firstWord === "@private") {
      // Remove the command and any following whitespace
      finalText = finalText.slice(firstWord.length).trim();
    }

    // Don't submit if the comment is empty after removing the command
    if (!finalText) return;

    addComment.mutate({
      teamId,
      clipId,
      body: finalText,
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
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="size-6" />
              </div>
            ) : comments && comments.length > 0 ? (
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
                ref={textareaRef}
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
    },
  ),
);
