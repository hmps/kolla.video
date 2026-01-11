"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle, Upload, XCircle } from "lucide-react";
import { use, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
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

interface FileUploadState {
  id: string;
  file: File;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  progress: number;
  error?: string;
  clipId?: number;
}

export default function PublicUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [uploaderName, setUploaderName] = useState("");
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [files, setFiles] = useState<FileUploadState[]>([]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    trpc.uploadLinks.getViaToken.queryOptions({ token }),
  );

  const presignUpload = useMutation(
    trpc.uploadLinks.presignUpload.mutationOptions(),
  );
  const confirmUpload = useMutation(
    trpc.uploadLinks.confirmUpload.mutationOptions(),
  );
  const enqueueProcessing = useMutation(
    trpc.uploadLinks.enqueueProcessing.mutationOptions(),
  );

  const handleUpload = useCallback(
    async (file: File, fileIndex: number, clipIndex: number) => {
      try {
        setFiles((prev) => {
          const next = [...prev];
          next[fileIndex] = { ...next[fileIndex], status: "uploading" };
          return next;
        });

        const result = await presignUpload.mutateAsync({
          token,
          uploaderName: uploaderName.trim(),
          index: clipIndex,
          contentType: file.type,
          size: file.size,
        });

        // Upload to R2 using presigned URL
        const uploadResponse = await fetch(result.presignedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload to storage failed");
        }

        // Confirm upload completed
        await confirmUpload.mutateAsync({
          token,
          clipId: result.clipId,
        });

        setFiles((prev) => {
          const next = [...prev];
          next[fileIndex] = {
            ...next[fileIndex],
            status: "processing",
            progress: 100,
            clipId: result.clipId,
          };
          return next;
        });

        // Enqueue for processing
        await enqueueProcessing.mutateAsync({
          token,
          clipId: result.clipId,
        });

        setFiles((prev) => {
          const next = [...prev];
          next[fileIndex] = { ...next[fileIndex], status: "complete" };
          return next;
        });
      } catch (error) {
        setFiles((prev) => {
          const next = [...prev];
          next[fileIndex] = {
            ...next[fileIndex],
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          };
          return next;
        });
      }
    },
    [token, uploaderName, presignUpload, confirmUpload, enqueueProcessing],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // First, get the starting index for these uploads (bypass cache to get fresh value)
      const { nextIndex } = await queryClient.fetchQuery({
        ...trpc.uploadLinks.getNextIndex.queryOptions({ token }),
        staleTime: 0,
      });

      const newFiles: FileUploadState[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${file.name}`,
        file,
        status: "pending",
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);

      // Start uploading each file with its assigned index
      acceptedFiles.forEach((file, index) => {
        handleUpload(file, files.length + index, nextIndex + index);
      });
    },
    [files.length, handleUpload, queryClient, trpc, token],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi"],
    },
  });

  const allComplete =
    files.length > 0 && files.every((f) => f.status === "complete");

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploaderName.trim().length > 0) {
      setHasEnteredName(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (invalid or expired link)
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              This upload link is not valid or has expired. Please contact the
              team coach for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { event, team } = data;

  // Name entry form
  if (!hasEnteredName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Upload Video</CardTitle>
            <CardDescription>
              Upload video clips to {team.name} - {event.title}
              <br />
              <span className="text-xs">
                {format(new Date(event.date), "PPP")} -{" "}
                <span className="capitalize">{event.type}</span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  required
                  minLength={1}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  This will be shown alongside your uploaded videos
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={uploaderName.trim().length === 0}
              >
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Upload interface
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">
            {team.name} - {format(new Date(event.date), "PPP")} -{" "}
            <span className="capitalize">{event.type}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Uploading as: <span className="font-medium">{uploaderName}</span>
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Video Clips</CardTitle>
            <CardDescription>
              Drag and drop video files or click to select
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">
                    Drag and drop video files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports MP4, MOV, AVI
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {files.map((fileState) => (
                  <div key={fileState.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium truncate">
                          {fileState.file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <span
                        className={`text-sm capitalize flex items-center gap-1 ${
                          fileState.status === "complete"
                            ? "text-green-600"
                            : fileState.status === "error"
                              ? "text-destructive"
                              : ""
                        }`}
                      >
                        {fileState.status === "complete" && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {fileState.status === "error" && (
                          <XCircle className="w-4 h-4" />
                        )}
                        {fileState.status}
                      </span>
                    </div>
                    {fileState.status === "uploading" && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${fileState.progress}%` }}
                        />
                      </div>
                    )}
                    {fileState.status === "error" && (
                      <p className="text-sm text-destructive">
                        {fileState.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {allComplete && (
                <div className="mt-6 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p className="text-lg font-medium">All uploads complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Your videos have been uploaded and are being processed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
