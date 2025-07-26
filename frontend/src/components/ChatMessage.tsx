import { cn } from "@/lib/utils";

interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
}

export const ChatMessage = ({ type, content }: ChatMessageProps) => {
  return (
    <div 
      className={cn(
        "w-full flex animate-fade-in",
        type === 'user' ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] md:max-w-[70%] rounded-lg px-4 py-3 shadow-lg",
          "border border-border/50",
          type === 'user' 
            ? "bg-chat-user text-chat-user-foreground ml-4" 
            : "bg-chat-assistant text-chat-assistant-foreground mr-4 border-border"
        )}
      >
        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      </div>
    </div>
  );
};