import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { VoiceButton } from '@/components/ui/voice-button';
import { MessageComponent, TypingIndicator } from '@/components/ui/message';
import { useWebSocket } from '@/hooks/use-websocket';
import { useVoice } from '@/hooks/use-voice';
import { useToast } from '@/hooks/use-toast';
import { type Message } from '@shared/schema';
import { Send, Settings, Lightbulb, Calendar, HelpCircle } from 'lucide-react';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [voiceResponses, setVoiceResponses] = useState(true);
  const [autoSend, setAutoSend] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const { isConnected, isTyping, sendMessage, addMessageHandler } = useWebSocket();
  const { isRecording, isProcessing, toggleRecording } = useVoice();

  // Load initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ['/api/messages'],
    queryFn: async () => {
      const response = await fetch('/api/messages');
      if (!response.ok) throw new Error('Failed to load messages');
      return response.json();
    },
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Handle WebSocket messages
  useEffect(() => {
    const unsubscribe = addMessageHandler((wsMessage) => {
      switch (wsMessage.type) {
        case 'message':
          if (wsMessage.message) {
            setMessages(prev => [...prev, wsMessage.message]);
          }
          break;
        case 'chunk':
          setStreamingContent(prev => prev + (wsMessage.content || ''));
          break;
        case 'complete':
          if (wsMessage.message) {
            setMessages(prev => [...prev, wsMessage.message]);
            setStreamingContent('');
          }
          break;
      }
    });

    return unsubscribe;
  }, [addMessageHandler]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [inputText]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, streamingContent, isTyping]);

  const sendChatMessage = useCallback((content: string, inputMethod: 'text' | 'voice' = 'text') => {
    if (!content.trim()) return;

    sendMessage({
      type: 'chat',
      content: content.trim(),
      inputMethod,
      generateSpeech: voiceResponses,
    });

    setInputText('');
  }, [sendMessage, voiceResponses]);

  const handleSendClick = () => {
    sendChatMessage(inputText, 'text');
  };

  const handleVoiceClick = async () => {
    try {
      if (isRecording) {
        const transcription = await toggleRecording();
        if (transcription) {
          if (autoSend) {
            sendChatMessage(transcription, 'voice');
          } else {
            setInputText(transcription);
          }
        }
      } else {
        await toggleRecording();
      }
    } catch (error) {
      console.error('Voice recording error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleQuickAction = (text: string) => {
    sendChatMessage(text, 'text');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-[hsl(237,84%,58%)] flex items-center justify-center text-white">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold gradient-text" data-testid="text-app-title">
                Voice AI Assistant
              </h1>
              <p className="text-xs text-muted-foreground">Powered by OpenAI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <div 
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent animate-pulse' : 'bg-destructive'}`} 
                data-testid="status-connection"
              />
              <span className="text-muted-foreground hidden sm:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <div 
          ref={chatContainerRef}
          className="chat-container space-y-4 pb-4"
          data-testid="container-chat"
        >
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-[hsl(237,84%,58%)] flex items-center justify-center text-white shadow-lg">
                <span className="text-3xl">🎤</span>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to Voice AI</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start a conversation by clicking the voice button below or type your message. 
                I can help you with questions, tasks, and more!
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))}

          {/* Streaming response */}
          {streamingContent && (
            <div className="flex justify-start message-enter">
              <div className="max-w-[80%] sm:max-w-[70%]">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[hsl(237,84%,58%)] flex items-center justify-center text-white flex-shrink-0 mt-1">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <p className="text-sm sm:text-base whitespace-pre-wrap">
                        {streamingContent}
                        <span className="animate-pulse">▊</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {isTyping && !streamingContent && <TypingIndicator />}
        </div>
      </main>

      {/* Input Controls */}
      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-6">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Voice Status Indicator */}
          {isRecording && (
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                <div className="voice-wave flex items-center gap-1">
                  <div className="w-1 h-4 bg-white rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-6 bg-white rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>
                  <div className="w-1 h-8 bg-white rounded animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-1 h-6 bg-white rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  <div className="w-1 h-4 bg-white rounded animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
                <span>Listening...</span>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="bg-card border border-border rounded-2xl shadow-lg p-3">
            <div className="flex items-end gap-3">
              
              {/* Voice Button */}
              <VoiceButton
                isRecording={isRecording}
                isProcessing={isProcessing}
                onClick={handleVoiceClick}
              />

              {/* Text Input */}
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message or use voice..."
                  className="min-h-[48px] resize-none border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-sm sm:text-base px-2 py-2"
                  rows={1}
                  data-testid="input-message"
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendClick}
                disabled={!inputText.trim()}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 p-0"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Input Mode Indicator */}
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                  <Checkbox
                    checked={voiceResponses}
                    onCheckedChange={setVoiceResponses}
                    data-testid="checkbox-voice-responses"
                  />
                  <span>Voice responses</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                  <Checkbox
                    checked={autoSend}
                    onCheckedChange={setAutoSend}
                    data-testid="checkbox-auto-send"
                  />
                  <span>Auto-send</span>
                </label>
              </div>
              <div className="text-xs text-muted-foreground">
                <kbd className="px-2 py-1 bg-secondary rounded text-xs">Enter</kbd> to send
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction("Tell me a joke")}
              className="text-xs"
              data-testid="button-quick-joke"
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              Tell me a joke
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction("What's on my calendar?")}
              className="text-xs"
              data-testid="button-quick-calendar"
            >
              <Calendar className="w-3 h-3 mr-1" />
              What's on my calendar?
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction("Help")}
              className="text-xs"
              data-testid="button-quick-help"
            >
              <HelpCircle className="w-3 h-3 mr-1" />
              Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
