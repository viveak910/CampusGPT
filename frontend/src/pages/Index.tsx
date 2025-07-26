import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/components/ChatMessage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    const query = input.trim();
    setInput('');

    try {
      const response = await fetch(`http://localhost:8000/ask?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer || 'Sorry, I couldn\'t find an answer to your question.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error fetching response:', error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the server. Please check if the backend is running on localhost:8000.",
        variant: "destructive",
      });
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I\'m having trouble connecting to the server. Please make sure the backend is running and try again.'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-2 bg-primary rounded-lg shadow-lg animate-pulse-glow">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              CampusGPT – Ask About Your College
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
        {/* Chat Messages */}
        <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Welcome to CampusGPT!
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Ask me anything about your college - admissions, courses, facilities, events, and more. I'm here to help!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                type={message.type}
                content={message.content}
              />
            ))
          )}
          
          {loading && <LoadingSpinner />}
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
          <div className="flex space-x-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about courses, admissions, facilities, events..."
              className="flex-1 bg-background border-border focus:ring-2 focus:ring-primary/50 focus:border-primary"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Send</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;