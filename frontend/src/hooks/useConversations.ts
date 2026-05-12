import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  deleteConversation,
  getConversation,
  listConversations,
  saveConversation,
} from '../lib/db';
import type { StoredConversation, UiMessage } from '../types/chat';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface CommitResult {
  id: string;
  isFirstTurn: boolean;
  messages: UiMessage[];
}

export interface UseConversationsApi {
  conversations: StoredConversation[];
  currentId: string | null;
  currentTitle: string | null;
  messages: UiMessage[];
  setMessages: Dispatch<SetStateAction<UiMessage[]>>;
  loaded: boolean;
  newChat: () => void;
  selectChat: (id: string) => Promise<void>;
  commit: () => Promise<CommitResult | null>;
  rename: (id: string, title: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useConversations(): UseConversationsApi {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessagesState] = useState<UiMessage[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Refs mirror the latest state so async callbacks (notably `commit`, which
  // is invoked from inside long-running streaming code) always see the most
  // recent values rather than the closure they were created with.
  const draftIdRef = useRef<string | null>(null);
  const messagesRef = useRef<UiMessage[]>(messages);
  const currentIdRef = useRef<string | null>(currentId);
  const conversationsRef = useRef<StoredConversation[]>(conversations);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  const setMessages: Dispatch<SetStateAction<UiMessage[]>> = useCallback(
    (updater) => {
      setMessagesState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: UiMessage[]) => UiMessage[])(prev)
            : updater;
        messagesRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    listConversations()
      .then((rows) => {
        if (cancelled) return;
        setConversations(rows);
        conversationsRef.current = rows;
      })
      .catch(() => {
        // IndexedDB unavailable (private mode etc.); we just run in-memory.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentTitle = useMemo(() => {
    if (currentId === null) return null;
    return conversations.find((c) => c.id === currentId)?.title ?? null;
  }, [conversations, currentId]);

  const newChat = useCallback(() => {
    draftIdRef.current = null;
    currentIdRef.current = null;
    messagesRef.current = [];
    setCurrentId(null);
    setMessages([]);
  }, [setMessages]);

  const selectChat = useCallback(
    async (id: string) => {
      if (id === currentIdRef.current) return;
      const row = await getConversation(id);
      if (!row) return;
      draftIdRef.current = null;
      currentIdRef.current = id;
      messagesRef.current = row.messages;
      setCurrentId(id);
      setMessages(row.messages);
    },
    [setMessages],
  );

  const commit = useCallback(async (): Promise<CommitResult | null> => {
    const msgs = messagesRef.current;
    if (msgs.length === 0) return null;

    const now = Date.now();
    let id = currentIdRef.current;
    let isFirstTurn = false;

    if (id === null) {
      id = draftIdRef.current ?? newId();
      draftIdRef.current = id;
      isFirstTurn = true;
    }

    const existing = conversationsRef.current.find((c) => c.id === id);
    const conv: StoredConversation = {
      id,
      title: existing?.title ?? 'New chat',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      messages: msgs,
    };

    try {
      await saveConversation(conv);
    } catch {
      // best-effort persistence
    }

    const nextList = [conv, ...conversationsRef.current.filter((c) => c.id !== id)];
    conversationsRef.current = nextList;
    setConversations(nextList);

    if (currentIdRef.current === null) {
      currentIdRef.current = id;
      setCurrentId(id);
    }

    return { id, isFirstTurn, messages: msgs };
  }, []);

  const rename = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const existing = await getConversation(id);
    if (!existing) return;

    const updated: StoredConversation = {
      ...existing,
      title: trimmed,
      updatedAt: Date.now(),
    };
    try {
      await saveConversation(updated);
    } catch {
      return;
    }

    const nextList = conversationsRef.current.map((c) =>
      c.id === id ? { ...c, title: trimmed } : c,
    );
    conversationsRef.current = nextList;
    setConversations(nextList);
  }, []);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
      } catch {
        return;
      }
      const nextList = conversationsRef.current.filter((c) => c.id !== id);
      conversationsRef.current = nextList;
      setConversations(nextList);

      if (currentIdRef.current === id) {
        draftIdRef.current = null;
        currentIdRef.current = null;
        messagesRef.current = [];
        setCurrentId(null);
        setMessages([]);
      }
    },
    [setMessages],
  );

  return {
    conversations,
    currentId,
    currentTitle,
    messages,
    setMessages,
    loaded,
    newChat,
    selectChat,
    commit,
    rename,
    remove,
  };
}
