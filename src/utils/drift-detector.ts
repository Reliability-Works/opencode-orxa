import type { Session } from "../types";

export const trackManualEdit = (session: Session): void => {
  session.manualEdits += 1;
};

export const getDriftScore = (session: Session): number => {
  const totalMessages = Math.max(1, session.messages.length);
  return session.manualEdits / totalMessages;
};

export const isDriftExceeded = (session: Session, threshold: number): boolean =>
  getDriftScore(session) > threshold;
