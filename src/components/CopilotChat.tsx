import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  BookmarkCheck,
  Utensils,
  MapPin,
  Compass,
  Lightbulb,
} from "lucide-react";
import { UserSavedPlace, ChatMessage } from "../types";

interface CopilotChatProps {
  journalPlaces: UserSavedPlace[];
}

const STARTER_PROMPTS = [
  "Recommend a cozy dinner spot from my wishlist!",
  "Create a 1-day foodie tour from my saved places",
  "What spicy dishes or hidden gems are in my journal?",
  "Compare the top coffee & dessert spots in my notes",
];

export const CopilotChat: React.FC<CopilotChatProps> = ({ journalPlaces }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: `Hello food lover! 👋 I am your **Taste Finder AI Assistant**. I am connected to **${journalPlaces.length} culinary spots** saved in your personal taste journal.\n\nLooking for dinner ideas, signature dish recommendations, or a 1-day foodie itinerary based on your wishlist? Ask me anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Send conversation history to server-side Gemini API
      const response = await fetch("/api/chat-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || "Failed to retrieve AI response");
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: `Sorry, there was an issue processing your request: ${err.message || "Please try again in a moment."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "model",
        content: `Conversation reset. I'm ready to help you explore ${journalPlaces.length} culinary spots in your taste journal. What would you like to plan?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="bg-[#FFFDF7] rounded-2xl sm:rounded-3xl border-[3px] border-[#18181B] shadow-[6px_6px_0px_#18181B] flex flex-col h-[640px] max-w-4xl mx-auto overflow-hidden pb-20 md:pb-0">
      {/* Copilot Header */}
      <div className="p-4 sm:p-5 border-b-2 border-[#18181B] bg-[#F7F4EA] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF08A] text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center font-black">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black font-display text-[#18181B]">
                Taste Finder (AI Copilot)
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#BBF7D0] text-[#18181B] border border-[#18181B] flex items-center gap-1 font-mono-code uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18181B] animate-ping" />
                Online
              </span>
            </div>
            <p className="text-xs text-[#52525B] flex items-center gap-1 mt-0.5 font-medium">
              <BookmarkCheck className="w-3.5 h-3.5 text-[#18181B]" />
              <span>Grounded on {journalPlaces.length} places from your personal taste journal</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          title="Start fresh conversation"
          className="p-2 text-[#18181B] hover:bg-white bg-[#FFFDF7] border-2 border-[#18181B] shadow-[2px_2px_0px_#18181B] rounded-xl transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 text-xs font-black flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Reset Session</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FDFBF7]">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
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

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed border-2 border-[#18181B] ${
                  isUser
                    ? "bg-[#18181B] text-[#FFFDF7] shadow-[3px_3px_0px_#FF99C8]"
                    : "bg-white text-[#18181B] shadow-[3.5px_3.5px_0px_#18181B]"
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-line font-medium leading-relaxed">{msg.content}</div>
                ) : (
                  <div className="markdown-body font-medium leading-relaxed text-[#18181B] [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-black [&_strong]:text-[#18181B] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-base [&_h1]:font-black [&_h2]:text-sm [&_h2]:font-black [&_h3]:text-xs [&_h3]:font-black">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
                <div
                  className={`text-[10px] mt-2 font-mono-code font-bold ${
                    isUser ? "text-stone-400 text-right" : "text-[#71716E]"
                  }`}
                >
                  {msg.timestamp}
                </div>
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
              <span className="text-[#18181B] font-black ml-1 font-mono-code">Gemini is flipping through your taste notes...</span>
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
              className="text-[11px] font-black text-[#18181B] bg-white border-2 border-[#18181B] hover:bg-[#FEF08A] px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 shadow-[2px_2px_0px_#18181B]"
            >
              💡 {prompt}
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
          placeholder="Ask for recommendations, compare restaurants, or plan an itinerary..."
          disabled={loading}
          className="flex-1 bg-white border-2 border-[#18181B] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#18181B] placeholder:text-[#71716E] focus:outline-none focus:ring-2 focus:ring-[#FF5533] font-bold shadow-[2px_2px_0px_#18181B]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-[#FF5533] hover:bg-[#ff4420] disabled:opacity-50 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 border-2 border-[#18181B] shadow-[2.5px_2.5px_0px_#18181B] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 shrink-0"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
