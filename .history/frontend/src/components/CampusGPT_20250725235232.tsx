import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, MessageCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

const CampusGPT = () => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/ask?query=${encodeURIComponent(currentQuestion)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: data.answer || 'No answer provided',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      console.error('Error fetching response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-primary shadow-glow-primary">
              <MessageCircle className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CampusGPT
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Ask About Your College
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-6 mb-8 bg-gradient-card border-border shadow-elevated">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask me anything about your college..."
                className="h-12 text-lg bg-input border-border focus:ring-primary focus:border-primary"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="h-12 px-8 bg-gradient-primary hover:shadow-glow-primary transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Asking...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="p-4 mb-6 bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-center">
              ⚠️ {error}
            </p>
          </Card>
        )}

        {/* Chat Messages */}
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="space-y-4">
              {/* User Question */}
              <div className="flex justify-end">
                <Card className="max-w-[85%] p-4 bg-chat-user border-primary/20 shadow-glow-soft">
                  <p className="text-chat-user-foreground">{message.question}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-chat-user-foreground/70">
                    <span>You</span>
                    <span>•</span>
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                </Card>
              </div>

              {/* Assistant Response */}
              <div className="flex justify-start">
                <Card className="max-w-[85%] p-4 bg-chat-assistant border-border shadow-glow-soft">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-chat-assistant-foreground leading-relaxed">
                        {message.answer}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-chat-assistant-foreground/70">
                        <span>CampusGPT</span>
                        <span>•</span>
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Ready to Help!
            </h3>
            <p className="text-muted-foreground">
              Ask me anything about your college and I'll provide detailed answers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampusGPT;