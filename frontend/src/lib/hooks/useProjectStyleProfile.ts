"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { projectsApi, styleApi } from "@/lib/api/client";

export function useProjectStyleProfile() {
  const { currentProject, writingStyleProfileId, setWritingStyleProfileId } =
    useAppStore();
  const [styleProfiles, setStyleProfiles] = useState<
    Array<{ _id: string; name: string }>
  >([]);

  useEffect(() => {
    styleApi
      .list()
      .then((r) => setStyleProfiles(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentProject?.styleProfileId) {
      setWritingStyleProfileId(currentProject.styleProfileId);
    }
  }, [currentProject?.styleProfileId, setWritingStyleProfileId]);

  async function saveStyleProfile(id: string) {
    setWritingStyleProfileId(id);
    if (currentProject) {
      await projectsApi.update(currentProject._id, {
        styleProfileId: id || null,
      });
    }
  }

  return {
    styleProfileId: writingStyleProfileId,
    styleProfiles,
    saveStyleProfile,
  };
}
