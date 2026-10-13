export type HuddleParticipant = {
  id: string;
  name: string;
  avatar: string;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isSpeaking: boolean;
};

export type HuddleControlGrant = {
  participantId: string;
  participantName: string;
  permission: "view" | "edit";
};

export type HuddleSnapshot = {
  active: boolean;
  startedAt: number | null;
  participants: HuddleParticipant[];
  sharerId: string | null;
  controlGrant: HuddleControlGrant | null;
};

export type HuddleEvent = { type: "state"; snapshot: HuddleSnapshot };
export type HuddleListener = (event: HuddleEvent) => void;

export interface HuddleService {
  startHuddle(participant: Pick<HuddleParticipant, "name" | "avatar">): void;
  leaveHuddle(): void;
  toggleMute(): void;
  toggleCamera(): void;
  startScreenShare(participantId: string): boolean;
  stopScreenShare(participantId: string): void;
  grantControl(
    participantId: string,
    permission: HuddleControlGrant["permission"],
  ): void;
  revokeControl(): void;
  onEvent(listener: HuddleListener): () => void;
  getSnapshot(): HuddleSnapshot;
}

const emptySnapshot = (): HuddleSnapshot => ({
  active: false,
  startedAt: null,
  participants: [],
  sharerId: null,
  controlGrant: null,
});

class MockHuddleService implements HuddleService {
  private snapshot = emptySnapshot();
  private readonly listeners = new Set<HuddleListener>();

  getSnapshot = () => this.snapshot;

  onEvent = (listener: HuddleListener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish() {
    const event: HuddleEvent = {
      type: "state",
      snapshot: this.snapshot,
    };
    this.listeners.forEach((listener) => listener(event));
  }

  startHuddle = (participant: Pick<HuddleParticipant, "name" | "avatar">) => {
    if (this.snapshot.active) return;
    this.snapshot = {
      active: true,
      startedAt: Date.now(),
      sharerId: null,
      controlGrant: null,
      participants: [
        {
          id: "you",
          name: participant.name,
          avatar: participant.avatar,
          isLocal: true,
          isMuted: false,
          isCameraOn: true,
          isSpeaking: true,
        },
        {
          id: "sarah",
          name: "Sarah Lin",
          avatar:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
          isLocal: false,
          isMuted: false,
          isCameraOn: true,
          isSpeaking: false,
        },
      ],
    };
    this.publish();
  };

  leaveHuddle = () => {
    this.snapshot = emptySnapshot();
    this.publish();
  };

  toggleMute = () => {
    this.snapshot = {
      ...this.snapshot,
      participants: this.snapshot.participants.map((participant) =>
        participant.isLocal
          ? { ...participant, isMuted: !participant.isMuted }
          : participant,
      ),
    };
    this.publish();
  };

  toggleCamera = () => {
    this.snapshot = {
      ...this.snapshot,
      participants: this.snapshot.participants.map((participant) =>
        participant.isLocal
          ? { ...participant, isCameraOn: !participant.isCameraOn }
          : participant,
      ),
    };
    this.publish();
  };

  startScreenShare = (participantId: string) => {
    if (!this.snapshot.active || this.snapshot.sharerId) return false;
    this.snapshot = { ...this.snapshot, sharerId: participantId, controlGrant: null };
    this.publish();
    return true;
  };

  stopScreenShare = (participantId: string) => {
    if (this.snapshot.sharerId !== participantId) return;
    this.snapshot = { ...this.snapshot, sharerId: null, controlGrant: null };
    this.publish();
  };

  grantControl = (
    participantId: string,
    permission: HuddleControlGrant["permission"],
  ) => {
    if (!this.snapshot.active || this.snapshot.sharerId !== "you") return;
    const participant = this.snapshot.participants.find(
      (item) => item.id === participantId && !item.isLocal,
    );
    if (!participant) return;
    this.snapshot = {
      ...this.snapshot,
      controlGrant: {
        participantId,
        participantName: participant.name,
        permission,
      },
    };
    this.publish();
  };

  revokeControl = () => {
    if (!this.snapshot.controlGrant) return;
    this.snapshot = { ...this.snapshot, controlGrant: null };
    this.publish();
  };
}

// TODO(partner): replace the mock call and screen-share state with WebRTC.
// TODO(partner): add a realtime sync layer for collaborative code editing.
export const huddleService: HuddleService = new MockHuddleService();
