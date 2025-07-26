export const LoadingSpinner = () => {
  return (
    <div className="flex justify-start w-full animate-fade-in">
      <div className="max-w-[85%] md:max-w-[70%] rounded-lg px-4 py-3 shadow-lg bg-chat-assistant text-chat-assistant-foreground mr-4 border border-border">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          <span className="text-sm text-muted-foreground ml-2">CampusGPT is thinking...</span>
        </div>
      </div>
    </div>
  );
};