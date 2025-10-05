import { format } from 'date-fns';
import { Mic, Keyboard, Volume2 } from 'lucide-react';
import { type Message } from '@shared/schema';
import { AudioPlayer } from './audio-player';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: Message;
  className?: string;
}

export function MessageComponent({ message, className }: MessageProps) {
  const isUser = message.role === 'user';
  const formattedTime = format(message.timestamp || new Date(), 'h:mm a');

  return (
    <div 
      className={cn(
        "flex message-enter",
        isUser ? "justify-end" : "justify-start",
        className
      )}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <div className="max-w-[80%] sm:max-w-[70%]">
        {!isUser && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[hsl(237,84%,58%)] flex items-center justify-center text-white flex-shrink-0 mt-1">
              <span className="text-sm">🤖</span>
            </div>
            <div className="flex-1">
              <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <p className="text-sm sm:text-base whitespace-pre-wrap" data-testid={`text-message-${message.id}`}>
                  {message.content}
                </p>
              </div>
              
              {message.hasAudio && message.audioUrl && (
                <div className="mt-2">
                  <AudioPlayer audioUrl={message.audioUrl} />
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${message.id}`}>
                  {formattedTime}
                </span>
                {message.hasAudio && <Volume2 className="w-3 h-3 text-accent" />}
              </div>
            </div>
          </div>
        )}
        
        {isUser && (
          <>
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
              <p className="text-sm sm:text-base whitespace-pre-wrap" data-testid={`text-message-${message.id}`}>
                {message.content}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 mt-1 px-2">
              <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${message.id}`}>
                {formattedTime}
              </span>
              {message.inputMethod === 'voice' ? (
                <Mic className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Keyboard className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start message-enter" data-testid="typing-indicator">
      <div className="max-w-[80%] sm:max-w-[70%]">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[hsl(237,84%,58%)] flex items-center justify-center text-white flex-shrink-0">
            <span className="text-sm">🤖</span>
          </div>
          <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
            <div className="typing-indicator flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
