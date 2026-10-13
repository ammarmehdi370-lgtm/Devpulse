"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  huddleService,
  type HuddleControlGrant,
  type HuddleParticipant,
  type HuddleSnapshot,
} from "../services/huddle";
import { useApp } from "./AppContext";

type HuddleContextValue = HuddleSnapshot & {
  start: () => void;
  leave: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  startScreenShare: (participantId: string) => boolean;
  stopScreenShare: (participantId: string) => void;
  grantControl: (
    participantId: string,
    permission: HuddleControlGrant["permission"],
  ) => void;
  revokeControl: () => void;
};

const HuddleContext = createContext<HuddleContextValue | null>(null);

export const HuddleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, addToast } = useApp();
  const [snapshot, setSnapshot] = useState(huddleService.getSnapshot);

  useEffect(
    () =>
      huddleService.onEvent((event) => {
        setSnapshot(event.snapshot);
      }),
    [],
  );

  const localParticipant: Pick<HuddleParticipant, "name" | "avatar"> = {
    name: user.name,
    avatar: user.avatar,
  };

  const start = () => {
    const wasActive = huddleService.getSnapshot().active;
    huddleService.startHuddle(localParticipant);
    if (!wasActive) {
      addToast({
        type: "success",
        title: "Huddle started",
        description: "Your team huddle is ready.",
      });
    }
  };
  const leave = () => {
    const previousGrant = huddleService.getSnapshot().controlGrant;
    huddleService.leaveHuddle();
    if (previousGrant?.permission === "edit") {
      addToast({
        type: "info",
        title: "Editing access ended",
        description: `${previousGrant.participantName} can no longer edit your code.`,
      });
    }
    addToast({
      type: "info",
      title: "Huddle ended",
      description: "You left the huddle.",
    });
  };
  const grantControl: HuddleContextValue["grantControl"] = (
    participantId,
    permission,
  ) => {
    const before = huddleService.getSnapshot().controlGrant;
    huddleService.grantControl(participantId, permission);
    const after = huddleService.getSnapshot().controlGrant;
    if (before?.permission !== "edit" && after?.permission === "edit") {
      addToast({
        type: "info",
        title: "Editing access granted",
        description: `${after.participantName} can edit your code.`,
      });
    } else if (before?.permission === "edit" && after?.permission !== "edit") {
      addToast({
        type: "info",
        title: "Editing access ended",
        description: `${before.participantName} can no longer edit your code.`,
      });
    }
  };
  const revokeControl = () => {
    const grant = huddleService.getSnapshot().controlGrant;
    huddleService.revokeControl();
    if (grant?.permission === "edit") {
      addToast({
        type: "info",
        title: "Editing access ended",
        description: `${grant.participantName} can no longer edit your code.`,
      });
    }
  };
  const stopScreenShare: HuddleContextValue["stopScreenShare"] = (
    participantId,
  ) => {
    const previousGrant = huddleService.getSnapshot().controlGrant;
    huddleService.stopScreenShare(participantId);
    if (
      previousGrant?.permission === "edit" &&
      !huddleService.getSnapshot().controlGrant
    ) {
      addToast({
        type: "info",
        title: "Editing access ended",
        description: `${previousGrant.participantName} can no longer edit your code.`,
      });
    }
  };

  return (
    <HuddleContext.Provider
      value={{
        ...snapshot,
        start,
        leave,
        toggleMute: huddleService.toggleMute,
        toggleCamera: huddleService.toggleCamera,
        startScreenShare: huddleService.startScreenShare,
        stopScreenShare,
        grantControl,
        revokeControl,
      }}
    >
      {children}
    </HuddleContext.Provider>
  );
};

export const useHuddle = () => {
  const value = useContext(HuddleContext);
  if (!value) throw new Error("useHuddle must be used within HuddleProvider.");
  return value;
};
