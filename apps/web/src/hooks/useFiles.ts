"use client";

import { useCallback, useEffect, useState } from "react";
import type { FileTreeNode, CreateFileInput } from "../services/file.service";
import type { ProjectFile } from "../lib/db/schema";
import { useBrowserServices } from "./useBrowserServices";

export function useFiles(projectId: string) {
  const { services, loading: servicesLoading, error: servicesError } = useBrowserServices();
  const [files, setFiles] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!services || !projectId) {
      setFiles([]);
      if (projectId) return;
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setFiles(await services.files.getFileTree(projectId));
      setError(null);
    } catch (reason) {
      const nextError = reason instanceof Error ? reason : new Error("Could not load project files.");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [projectId, services]);

  useEffect(() => {
    if (!services) {
      setLoading(servicesLoading);
      if (servicesError) setError(servicesError);
      return;
    }
    void refresh().catch(() => undefined);
  }, [refresh, services, servicesError, servicesLoading]);

  const createFile = useCallback(async (input: CreateFileInput): Promise<ProjectFile> => {
    if (!services) throw new Error("Browser services are not ready.");
    const file = await services.files.createFile({ ...input, projectId });
    await refresh();
    return file;
  }, [projectId, refresh, services]);

  const saveFile = useCallback(async (
    fileId: string,
    content: string,
    message?: string,
  ): Promise<ProjectFile> => {
    if (!services) throw new Error("Browser services are not ready.");
    const file = await services.files.saveFile(fileId, content, message);
    await refresh();
    return file;
  }, [refresh, services]);

  const createBinaryFile = useCallback(async (
    input: Omit<CreateFileInput, "content"> & { content: Uint8Array },
  ): Promise<ProjectFile> => {
    if (!services) throw new Error("Browser services are not ready.");
    const file = await services.files.createBinaryFile({ ...input, projectId });
    await refresh();
    return file;
  }, [projectId, refresh, services]);

  const readFile = useCallback(async (fileId: string): Promise<string> => {
    if (!services) throw new Error("Browser services are not ready.");
    return services.files.readFile(fileId);
  }, [services]);

  const readFileBytes = useCallback(async (fileId: string): Promise<Uint8Array> => {
    if (!services) throw new Error("Browser services are not ready.");
    return services.files.readFileBytes(fileId);
  }, [services]);

  const saveBinaryFile = useCallback(async (
    fileId: string,
    content: Uint8Array,
  ): Promise<ProjectFile> => {
    if (!services) throw new Error("Browser services are not ready.");
    const file = await services.files.saveBinaryFile(fileId, content);
    await refresh();
    return file;
  }, [refresh, services]);

  const deleteFile = useCallback(async (fileId: string): Promise<void> => {
    if (!services) throw new Error("Browser services are not ready.");
    await services.files.deleteFile(fileId);
    await refresh();
  }, [refresh, services]);

  return {
    files,
    loading: loading || servicesLoading,
    error: error ?? servicesError,
    refresh,
    createFile,
    createBinaryFile,
    readFile,
    readFileBytes,
    saveFile,
    saveBinaryFile,
    deleteFile,
  };
}
