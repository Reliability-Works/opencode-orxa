import type { Message, Session, SessionContext } from "../types";

const sessionContextStore = new Map<string, SessionContext>();

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

export const summarizeSession = async (messages: Message[]): Promise<string> => {
  if (messages.length === 0) {
    return "No session activity.";
  }

  const recent = messages.slice(-10);
  const summary = recent
    .map((message) => `${message.role}: ${truncate(message.content, 120)}`)
    .join("\n");

  return `Summary\n${summary}`;
};

export const checkpointSession = async (session: Session): Promise<void> => {
  const summary = await summarizeSession(session.messages);
  const context: SessionContext = {
    sessionId: session.id,
    summary,
    lastUpdated: new Date().toISOString(),
  };

  sessionContextStore.set(session.id, context);
  session.metadata = {
    ...session.metadata,
    lastCheckpoint: context.lastUpdated,
  };
};

export const getSessionContext = (sessionId: string): SessionContext =>
  sessionContextStore.get(sessionId) ?? {
    sessionId,
    summary: "",
    lastUpdated: "",
  };
