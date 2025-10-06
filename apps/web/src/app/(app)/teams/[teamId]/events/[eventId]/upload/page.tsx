"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTRPC } from "@/trpc/client";

interface FileUploadState {
  id: string;
  file: File;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  progress: number;
  error?: string;
  clipId?: number;
}

export default function UploadPage({
  params,
}: {
  params: Promise<{ teamId: string; eventId: string }>;
}) {
  const { teamId, eventId } = use(params);
  const router = useRouter();
  const teamIdNum = Number.parseInt(teamId, 10);
  const eventIdNum = Number.parseInt(eventId, 10);

  const [files, setFiles] = useState<FileUploadState[]>([]);

  const trpc = useTRPC();
  const { data: team } = useQuery(
    trpc.teams.get.queryOptions({ teamId: teamIdNum }),
  );
  const { data: event } = useQuery(
    trpc.events.get.queryOptions({ teamId: teamIdNum, eventId: eventIdNum }),
  );
  const presignUpload = useMutation(trpc.clips.presignUpload.mutationOptions());
  const confirmUpload = useMutation(trpc.clips.confirmUpload.mutationOptions());
  const enqueueProcessing = useMutation(
    trpc.clips.enqueueProcessing.mutationOptions(),
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
          teamId: teamIdNum,
          eventId: eventIdNum,
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
          teamId: teamIdNum,
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
          teamId: teamIdNum,
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
    [teamIdNum, eventIdNum, presignUpload, confirmUpload, enqueueProcessing],
  );

  const queryClient = useQueryClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // First, get the starting index for these uploads
      const { nextIndex } = await queryClient.fetchQuery(
        trpc.clips.getNextIndex.queryOptions({
          teamId: teamIdNum,
          eventId: eventIdNum,
        }),
      );

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
    [files.length, handleUpload, queryClient, trpc, teamIdNum, eventIdNum],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi"],
    },
  });

  const allComplete =
    files.length > 0 && files.every((f) => f.status === "complete");

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
                  <Link href={`/teams/${teamId}`}>{team?.name || "Team"}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/teams/${teamId}/events/${eventId}`}>
                    {event?.title || "Event"}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Upload</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="container mx-auto max-w-4xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Video Clips</CardTitle>
              <CardDescription>
                Upload video files to be processed and added to this event
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
                        <div>
                          <p className="font-medium">{fileState.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <span className="text-sm capitalize">
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
                  <div className="mt-6">
                    <Button
                      onClick={() =>
                        router.push(`/teams/${teamId}/events/${eventId}`)
                      }
                    >
                      View Event
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
