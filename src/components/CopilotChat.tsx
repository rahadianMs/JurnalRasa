import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  BookmarkCheck,
  CheckCircle2,
  Lightbulb,
  Cloud,
  History,
  Clock,
  Plus,
  Check,
  MapPin,
  Utensils,
  Trash2,
  X,
  Compass,
  BookOpen,
} from "lucide-react";
import { UserSavedPlace, ChatMessage, RecommendedTastePlace, ChatConversationMeta } from "../types";
import {
  auth,
  db,
  getCurrentUserToken,
  collection,
  doc,
  writeBatch,
  getDocs,
  deleteDoc,
} from "../lib/firebase";
import { messageCacheKey, readActiveConversation, readConversationList, readMessages, mergeConversations, mergeMessages, saveLocalConversation } from "../lib/chatHistory";

interface CopilotChatProps {
  journalPlaces: UserSavedPlace[];
  userId?: string | null;
  onSavePlace?: (place: RecommendedTastePlace) => Promise<void> | void;
}

const STARTER_PROMPTS = [
  "🍲 Find similar dishes to my saved favorites",
  "🧭 Explore new menus based on my taste profile",
  "🌶️ Discover hidden gems matching my spicy cravings",
  "☕ Recommend twin spots for my top cafes & bakeries",
  "🗺️ Plan a 1-day foodie itinerary from my wishlist",
];

export const CopilotChat: React.FC<CopilotChatProps> = ({
  journalPlaces,
  userId,
  onSavePlace,
}) => {
  const currentUid = userId || auth.currentUser?.uid || "guest_user";
  const [conversationId, setConversationId] = useState<string>(() => {
    try {
      const active = readActiveConversation(localStorage, currentUid);
      if (active) return active;
    } catch {}
    return "conv_" + crypto.randomUUID();
  });

  const [conversationSummary, setConversationSummary] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversationMeta[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [localSavedNames, setLocalSavedNames] = useState<Set<string>>(new Set());
  const [noteSavedMessageIds, setNoteSavedMessageIds] = useState<Set<string>>(new Set());

  const initialWelcomeMessage: ChatMessage = {
    id: "welcome",
    role: "model",
    content: `Hello food lover! 👋 I am your **Taste Finder AI Assistant**.\n\nI am grounded directly in **${journalPlaces.length} spots** saved in your personal taste journal.\n\nHere are some things you can ask me:\n- 🍲 **Find similar dishes**: Discover spots serving flavors like your saved favorites.\n- 🧭 **Explore new menus**: Get recommendations tailored to your spice, sweet, or savory palate.\n- 🗺️ **Foodie Itineraries**: Plan a day of dining from your wishlist.\n\nAsk me anything, and you can save recommended culinary gems directly to your **Taste Journal**!`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const cloudEnabled = auth.currentUser?.uid === currentUid;
  const localRevision = useRef(0);
  const deletedConversations = useRef(new Set<string>());
  const cloudQueue = useRef<Promise<void>>(Promise.resolve());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load conversation list (history) from localStorage & Firestore
  useEffect(() => {
    if (!currentUid) return;

    let isMounted = true;
    const loadConversationList = async () => {
      // 1. Local storage cache
      try {
        setConversations(readConversationList(localStorage, currentUid));
      } catch {}

      // 2. Firestore query
      if (!cloudEnabled) return;
      try {
        const convCol = collection(db, `users/${currentUid}/conversations`);
        const snapshot = await getDocs(convCol);
        if (isMounted && !snapshot.empty) {
          const list: ChatConversationMeta[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              summary: data.summary || "Taste Exploration",
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              messageCount: data.messageCount || 0,
            });
          });

          // Sort by latest updated
          list.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          // A delayed/older cloud snapshot must not discard local-only sessions.
          const merged = mergeConversations(list, readConversationList(localStorage, currentUid))
            .filter(c => !deletedConversations.current.has(c.id));
          setConversations(prev => mergeConversations(merged, prev));
          try {
            localStorage.setItem(`jr_conv_list_${currentUid}`, JSON.stringify(merged));
          } catch {}
        }
      } catch (err) {
        console.warn("Could not load conversations from Firestore:", err);
      }
    };

    loadConversationList();
    return () => {
      isMounted = false;
    };
  }, [currentUid, cloudEnabled]);

  // Load active conversation & messages
  useEffect(() => {
    if (!currentUid || !conversationId) return;

    let isMounted = true;
    const revision = localRevision.current;

    // First check local storage cache for instant rendering
    setMessages([initialWelcomeMessage]);
    setConversationSummary(null);
    try {
      const cachedMsgs = readMessages(localStorage, currentUid, conversationId);
      setMessages(cachedMsgs.length ? cachedMsgs : [initialWelcomeMessage]);
      setConversationSummary(readConversationList(localStorage, currentUid).find(c => c.id === conversationId)?.summary || null);
    } catch {}

    const loadConversation = async () => {
      if (!cloudEnabled) return;
      try {
        const messagesCol = collection(
          db,
          `users/${currentUid}/conversations/${conversationId}/messages`
        );
        const snapshot = await getDocs(messagesCol);

        if (isMounted && revision === localRevision.current && !snapshot.empty) {
          const loaded: ChatMessage[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            loaded.push({
              id: d.id,
              role: data.role,
              content: data.content,
              timestamp: data.timestamp || "",
              suggestedPlaces: data.suggestedPlaces,
            });
          });

          // Sort messages chronologically by ID or timestamp
          loaded.sort((a, b) => a.id.localeCompare(b.id));

          if (loaded.length > 0) {
            const merged = mergeMessages(loaded, readMessages(localStorage, currentUid, conversationId));
            setMessages(merged);
            try {
              localStorage.setItem(messageCacheKey(currentUid, conversationId), JSON.stringify(merged));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Could not load persisted conversation from Firestore:", err);
      }
    };

    loadConversation();

    return () => {
      isMounted = false;
    };
  }, [currentUid, conversationId, cloudEnabled]);

  // Local persistence is synchronous and independent of both AI and cloud availability.
  const persistConversation = (nextMessages: ChatMessage[], summary: string, activate = false) => {
    localRevision.current += 1;
    const now = new Date().toISOString();
    let meta: ChatConversationMeta = {
      id: conversationId, summary,
      createdAt: conversations.find(c => c.id === conversationId)?.createdAt || now,
      updatedAt: now, messageCount: nextMessages.filter(m => !m.id.startsWith("welcome")).length,
    };
    let savedLocally = false;
    try {
      const saved = saveLocalConversation(localStorage, currentUid, conversationId, nextMessages, summary, now, activate);
      meta = saved.meta;
      setConversations(saved.list);
      savedLocally = true;
    } catch (err) {
      console.warn("Could not save chat history on this device:", err);
      setConversations(prev => mergeConversations(prev, [meta]));
    }
    setConversationSummary(summary);
    setStorageNotice(savedLocally ? "Saved on this device" : "Chat could not be saved on this device.");

    if (!cloudEnabled) return;
    // Keep cloud writes ordered without delaying the AI request.
    const revision = localRevision.current;
    const sync = async () => {
      try {
        // Include cached turns so a later successful save also repairs earlier failed writes.
        const savedMessages = nextMessages.filter(m => !m.id.startsWith("welcome"));
        for (let offset = 0; offset < savedMessages.length; offset += 400) {
          const batch = writeBatch(db);
          for (const message of savedMessages.slice(offset, offset + 400)) {
            batch.set(doc(db, `users/${currentUid}/conversations/${conversationId}/messages/${message.id}`), {
              role: message.role, content: message.content, timestamp: message.timestamp,
              suggestedPlaces: message.suggestedPlaces || [],
            });
          }
          if (offset + 400 >= savedMessages.length) {
            batch.set(doc(db, `users/${currentUid}/conversations/${conversationId}`), { ...meta, userId: currentUid }, { merge: true });
          }
          await batch.commit();
        }
        if (localRevision.current === revision) setStorageNotice("Synced to your account");
      } catch (err) {
        console.warn("Could not sync chat history:", err);
        if (localRevision.current === revision) setStorageNotice(savedLocally
          ? "Saved on this device. Cloud sync is unavailable."
          : "Chat could not be saved. Please copy it before leaving.");
      }
    };
    cloudQueue.current = cloudQueue.current.then(sync);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Helper to check if a place name is already saved in personal journal
  const isPlaceSaved = (name: string) => {
    const norm = name.toLowerCase().trim();
    if (localSavedNames.has(norm)) return true;
    return journalPlaces.some((p) => p.name.toLowerCase().trim() === norm);
  };

  // Save recommended place to journal
  const handleSaveSuggestedPlace = async (place: RecommendedTastePlace) => {
    if (onSavePlace) {
      await onSavePlace(place);
      setLocalSavedNames((prev) => new Set([...prev, place.name.toLowerCase().trim()]));
    }
  };

  // Save full message advice as a custom taste journal note
  const handleSaveMessageAsNote = async (msg: ChatMessage) => {
    if (!onSavePlace || noteSavedMessageIds.has(msg.id)) return;

    const lines = msg.content.split("\n").filter((l) => l.trim().length > 0);
    const cleanFirstLine = lines[0]?.replace(/[#*`]/g, "").slice(0, 45).trim() || "Taste Finder Guide";

    await onSavePlace({
      name: `AI Guide: ${cleanFirstLine}`,
      city: journalPlaces[0]?.city || "Indonesia",
      signatureDish: "Curated Taste Guide",
      matchReason: msg.content.slice(0, 160).replace(/[#*`]/g, "") + "...",
      tags: ["AI Note", "Taste Finder"],
    });

    setNoteSavedMessageIds((prev) => new Set([...prev, msg.id]));
  };

  // Select a past conversation from history
  const handleSelectConversation = (conv: ChatConversationMeta) => {
    if (loading) return;
    localRevision.current += 1;
    setStorageNotice(null);
    setConversationId(conv.id);
    setConversationSummary(conv.summary);
    setShowHistoryModal(false);

    if (currentUid) {
      try { localStorage.setItem(`jr_active_conv_${currentUid}`, conv.id); } catch {}
    }
  };

  // Delete a conversation from history
  const handleDeleteConversation = async (convIdToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    localRevision.current += 1;
    deletedConversations.current.add(convIdToDelete);

    // Remove from state
    const updatedList = conversations.filter((c) => c.id !== convIdToDelete);
    setConversations(updatedList);

    try {
      localStorage.setItem(`jr_conv_list_${currentUid}`, JSON.stringify(updatedList));
      localStorage.removeItem(messageCacheKey(currentUid, convIdToDelete));
      localStorage.removeItem(`jr_msgs_${convIdToDelete}`);
    } catch {}

    // If deleting currently active conversation, reset to new
    if (convIdToDelete === conversationId) {
      handleResetChat();
    }

    // Delete from Firestore
    if (cloudEnabled) {
      try {
        // Finish queued saves first so they cannot recreate a deleted session.
        await cloudQueue.current;
        await deleteDoc(doc(db, `users/${currentUid}/conversations`, convIdToDelete));
      } catch (err) {
        console.warn("Could not delete conversation doc from Firestore:", err);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const raw = (textToSend || input).trim();
    if (!raw || loading) return;

    // Sanitize user message: strip script/HTML tags, control characters, max length 1000
    const messageText = raw
      .replace(/<[^>]*>?/gm, "")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim()
      .slice(0, 1000);

    if (!messageText) return;

    const userMsgId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    persistConversation(newMessages, conversationSummary || messageText.slice(0, 35), true);

    try {
      const token = await getCurrentUserToken();

      const response = await fetch("/api/chat-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          journalEntries: journalPlaces.map((p) => ({
            name: p.name,
            city: p.city,
            address: p.address,
            recommendedDishes: p.recommendedDishes,
            personalNotes: p.personalNotes,
            visited: p.visited,
            tags: p.tags,
          })),
        }),
      });

      const data = await response.json();

      if (data.success && data.reply) {
        const aiMsgId = (Date.now() + 1).toString();
        const aiMessage: ChatMessage = {
          id: aiMsgId,
          role: "model",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedPlaces: data.suggestedPlaces || [],
        };

        const finalMessages = [...newMessages, aiMessage];
        setMessages(finalMessages);

        persistConversation(finalMessages, data.summary || conversationSummary || messageText.slice(0, 35));
      } else {
        throw new Error(data.error || "Failed to receive a response from AI Taste Copilot");
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: `Sorry, an issue occurred while processing your request: ${err.message || "Please try again shortly."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const failedMessages = [...newMessages, errorMessage];
      setMessages(failedMessages);
      persistConversation(failedMessages, conversationSummary || messageText.slice(0, 35));
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    if (loading) return;
    localRevision.current += 1;
    setStorageNotice(null);
    const newConvId = "conv_" + crypto.randomUUID();
    setConversationId(newConvId);
    setConversationSummary(null);
    setShowHistoryModal(false);

    if (currentUid) {
      try { localStorage.setItem(`jr_active_conv_${currentUid}`, newConvId); } catch {}
    }

    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "model",
        content: `New session started! 🌟 What would you like to explore today? You can search for dishes similar to your favorites, or explore new menus based on your taste profile!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="bg-[#FFFDF7] rounded-2xl sm:rounded-3xl border-[3px] border-[#18181B] shadow-[6px_6px_0px_#18181B] flex flex-col h-[660px] max-w-4xl mx-auto overflow-hidden pb-20 md:pb-0 relative">
      {/* Copilot Header */}
      <div className="p-4 sm:p-5 border-b-2 border-[#18181B] bg-[#F7F4EA] flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center font-black shrink-0">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black font-display text-[#18181B] truncate">
                Taste Finder (AI Copilot)
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#BBF7D0] text-[#18181B] border border-[#18181B] flex items-center gap-1 font-mono-code uppercase shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18181B] animate-ping" />
                Online
              </span>
            </div>
            <p className="text-xs text-[#52525B] flex items-center gap-1 mt-0.5 font-medium truncate">
              <BookmarkCheck className="w-3.5 h-3.5 text-[#18181B] shrink-0" />
              <span className="truncate">Grounded on {journalPlaces.length} places from your Taste Journal</span>
            </p>
          </div>
        </div>

        {/* Action Controls: History + New Session */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHistoryModal(true)}
            title="View chat history & saved conversations"
            className="p-2 text-[#18181B] hover:bg-[#FEF08A] bg-[#FFFDF7] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 stroke-[2.5] text-[#18181B]" />
            <span className="hidden sm:inline">History</span>
            {conversations.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#BAE6FD] text-[#18181B] border border-[#18181B] rounded text-[10px] font-mono-code font-bold">
                {conversations.length}
              </span>
            )}
          </button>

          <button
            onClick={handleResetChat}
            disabled={loading}
            title="Start fresh conversation"
            className="p-2 text-[#18181B] hover:bg-white bg-[#FFFDF7] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {storageNotice && (
        <p role="status" className="px-4 py-2 text-xs font-medium border-b-2 border-[#18181B] bg-[#FFFDF7]">
          {storageNotice}
        </p>
      )}

      {/* Auto Summary Banner if present */}
      {conversationSummary && (
        <div className="px-4 py-2 bg-[#E0F2FE] border-b-2 border-[#18181B] flex items-center justify-between text-xs font-bold text-[#18181B]">
          <div className="flex items-center gap-2 truncate">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Topic: "{conversationSummary}"</span>
          </div>
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono-code bg-white px-2 py-0.5 rounded border border-[#18181B]">
            <Cloud className="w-3 h-3 text-emerald-600" />
            Chat Session
          </span>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FDFBF7]">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isNoteSaved = noteSavedMessageIds.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] ${
                  isUser
                    ? "bg-[#18181B] text-[#FFFDF7]"
                    : "bg-[#FEF08A] text-[#18181B]"
                }`}
              >
                {isUser ? <User className="w-4 h-4 stroke-[2.5]" /> : <Bot className="w-4 h-4 stroke-[2.5]" />}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed border-2 border-[#18181B] ${
                  isUser
                    ? "bg-[#18181B] text-[#FFFDF7] shadow-[3px_3px_0px_#FF99C8]"
                    : "bg-white text-[#18181B] shadow-[3.5px_3.5px_0px_#18181B]"
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-line font-medium leading-relaxed">{msg.content}</div>
                ) : (
                  <div>
                    <div className="markdown-body font-medium leading-relaxed text-[#18181B] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-black [&_strong]:text-[#18181B] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-base [&_h1]:font-black [&_h2]:text-sm [&_h2]:font-black [&_h3]:text-xs [&_h3]:font-black">
                      <Markdown>{msg.content}</Markdown>
                    </div>

                    {/* STRUCTURED RECOMMENDATION CARDS (with direct Save to Taste Journal button) */}
                    {msg.suggestedPlaces && msg.suggestedPlaces.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t-2 border-[#18181B]/15 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#18181B]">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Taste Gems Recommended by AI:</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {msg.suggestedPlaces.map((place, pIdx) => {
                            const saved = isPlaceSaved(place.name);

                            return (
                              <div
                                key={pIdx}
                                className="p-3 bg-[#FFFDF7] rounded-xl border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] flex flex-col justify-between gap-2 transition-transform hover:-translate-y-0.5"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-1">
                                    <h4 className="text-xs font-black text-[#18181B] leading-tight">
                                      {place.name}
                                    </h4>
                                    <span className="px-1.5 py-0.5 bg-[#BAE6FD] text-[#18181B] border border-[#18181B] rounded text-[9px] font-mono-code font-black shrink-0">
                                      {place.city}
                                    </span>
                                  </div>

                                  {place.signatureDish && (
                                    <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#FF5533]">
                                      <Utensils className="w-3 h-3 stroke-[2.5] shrink-0" />
                                      <span className="truncate">{place.signatureDish}</span>
                                    </div>
                                  )}

                                  {place.matchReason && (
                                    <p className="mt-1 text-[10px] text-[#52525B] leading-tight font-medium">
                                      💡 {place.matchReason}
                                    </p>
                                  )}
                                </div>

                                <div className="pt-1.5 border-t border-[#18181B]/10 flex items-center justify-between gap-2">
                                  {place.tags && place.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {place.tags.slice(0, 2).map((t, ti) => (
                                        <span
                                          key={ti}
                                          className="text-[9px] font-bold px-1.5 py-0.2 bg-[#F7F4EA] border border-[#18181B] rounded"
                                        >
                                          #{t}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Save to Taste Journal Button */}
                                  <button
                                    onClick={() => handleSaveSuggestedPlace(place)}
                                    disabled={saved}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border-2 transition-all flex items-center gap-1 cursor-pointer shrink-0 ml-auto ${
                                      saved
                                        ? "bg-[#BBF7D0] text-[#18181B] border-[#18181B] cursor-default opacity-90"
                                        : "bg-[#FF5533] hover:bg-[#ff4420] text-white border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-x-0.5 active:translate-y-0.5"
                                    }`}
                                  >
                                    {saved ? (
                                      <>
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        <span>Saved in Journal</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3 h-3 stroke-[3]" />
                                        <span>+ Save to Journal</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quick action: Save full message as custom note */}
                    {msg.id !== "welcome" && (
                      <div className="mt-3 pt-2 border-t border-[#18181B]/10 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleSaveMessageAsNote(msg)}
                          disabled={isNoteSaved}
                          className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 transition-all cursor-pointer ${
                            isNoteSaved
                              ? "bg-[#BBF7D0] text-[#18181B] border-[#18181B]"
                              : "bg-[#FFFDF7] hover:bg-[#FEF08A] text-[#18181B] border-[#18181B] shadow-[1px_1px_0px_#18181B]"
                          }`}
                        >
                          {isNoteSaved ? (
                            <>
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Saved as Taste Note</span>
                            </>
                          ) : (
                            <>
                              <BookmarkCheck className="w-3 h-3 stroke-[2.5]" />
                              <span>Save advice as Note</span>
                            </>
                          )}
                        </button>

                        <div className="text-[10px] font-mono-code font-bold text-[#71716E]">
                          {msg.timestamp}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isUser && (
                  <div className="text-[10px] mt-2 font-mono-code font-bold text-stone-400 text-right">
                    {msg.timestamp}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="bg-white border-2 border-[#18181B] shadow-[3px_3px_0px_#18181B] rounded-2xl p-4 text-xs font-bold text-[#18181B] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5533] animate-bounce" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEF08A] animate-bounce [animation-delay:0.2s] border border-[#18181B]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-bounce [animation-delay:0.4s]" />
              <span className="text-[#18181B] font-black ml-1 font-mono-code">
                Gemini is analyzing your journal and crafting taste recommendations...
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Starter Prompts */}
      {messages.length <= 2 && (
        <div className="px-4 py-2.5 bg-[#F7F4EA] border-t-2 border-[#18181B] overflow-x-auto flex gap-2 no-scrollbar">
          {STARTER_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FEF08A] px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-[2px_2px_0px_#18181B] cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 sm:p-4 bg-white border-t-2 border-[#18181B] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for similar dishes, explore new menus, or plan an itinerary..."
          disabled={loading}
          maxLength={1000}
          className="flex-1 bg-white border-2 border-[#18181B] rounded-xl px-3.5 sm:px-4 py-2.5 text-base sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="min-w-[42px] min-h-[42px] sm:min-w-[44px] sm:min-h-[44px] bg-[#FF5533] hover:bg-[#ff4420] disabled:opacity-50 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>

      {/* CHAT HISTORY & PREVIOUS SESSIONS MODAL / DRAWER */}
      {showHistoryModal && (
        <div className="absolute inset-0 z-50 bg-[#18181B]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-[#FFFDF7] rounded-2xl border-[3px] border-[#18181B] shadow-[8px_8px_0px_#18181B] w-full max-w-lg max-h-[85%] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-[#FEF08A] border-b-2 border-[#18181B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#18181B] stroke-[2.5]" />
                <h3 className="font-display font-black text-base text-[#18181B]">
                  Chat History & Previous Sessions
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg border-2 border-[#18181B] bg-white hover:bg-[#FF5533] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-black text-[#52525B]">
                  Saved Conversations ({conversations.length})
                </span>
                <button
                  onClick={handleResetChat}
                  disabled={loading}
                  className="px-2.5 py-1 text-xs font-black bg-[#BBF7D0] hover:bg-[#86efac] text-[#18181B] border-2 border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] rounded-lg flex items-center gap-1 cursor-pointer transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Chat</span>
                </button>
              </div>

              {conversations.length === 0 ? (
                <div className="p-6 text-center rounded-xl border-2 border-dashed border-[#18181B]/40 bg-[#F7F4EA]/60 space-y-2">
                  <Clock className="w-8 h-8 text-[#52525B] mx-auto opacity-70" />
                  <p className="text-xs font-bold text-[#18181B]">No previous chats recorded yet</p>
                  <p className="text-[11px] text-[#52525B]">
                    Conversations you have with Taste Finder are automatically saved here so you can review previous foodie recommendations!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => {
                    const isActive = conv.id === conversationId;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        aria-disabled={loading}
                        className={`p-3 rounded-xl border-2 border-[#18181B] transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isActive
                            ? "bg-[#FEF08A] shadow-[3px_3px_0px_#18181B]"
                            : "bg-white hover:bg-[#F7F4EA] shadow-[2px_2px_0px_#18181B]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-[#18181B] truncate">
                              {conv.summary || "Culinary Chat Exploration"}
                            </h4>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded bg-[#18181B] text-[#FFFDF7] text-[9px] font-mono-code font-bold uppercase shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-[#52525B] font-mono-code">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </span>
                            {conv.messageCount !== undefined && (
                              <span>{conv.messageCount} messages</span>
                            )}
                          </div>
                        </div>

                        {/* Delete conversation button */}
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          disabled={loading}
                          title="Delete this chat history"
                          className="p-1.5 rounded-lg border border-[#18181B] bg-white hover:bg-[#FF5533] hover:text-white transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#F7F4EA] border-t-2 border-[#18181B] flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 bg-[#18181B] text-white rounded-xl text-xs font-black border-2 border-[#18181B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
