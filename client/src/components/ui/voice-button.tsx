import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onClick: () => void;
  className?: string;
}

export function VoiceButton({ isRecording, isProcessing, onClick, className }: VoiceButtonProps) {
  return (
    <div className="relative">
      <Button
        onClick={onClick}
        disabled={isProcessing}
        className={cn(
          "relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[hsl(237,84%,58%)] text-primary-foreground hover:shadow-xl transition-all duration-300 group p-0",
          className
        )}
        data-testid="button-voice-toggle"
      >
        {/* Pulse rings for active state */}
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-primary opacity-75 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-primary opacity-50 animate-ping" style={{ animationDelay: '0.5s' }} />
          </>
        )}
        
        {isProcessing ? (
          <div className="animate-spin">⟳</div>
        ) : isRecording ? (
          <MicOff className="w-5 h-5 relative z-10" />
        ) : (
          <Mic className="w-5 h-5 relative z-10" />
        )}
      </Button>
    </div>
  );
}
