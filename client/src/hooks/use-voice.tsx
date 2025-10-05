import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording failed",
        description: "Please check your microphone permissions",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No active recording'));
        return;
      }

      setIsRecording(false);
      setIsProcessing(true);

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.wav');

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const result = await response.json();
          setIsProcessing(false);
          resolve(result.text);
        } catch (error) {
          setIsProcessing(false);
          toast({
            title: "Transcription failed",
            description: "Please try speaking again",
            variant: "destructive",
          });
          reject(error);
        }
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release microphone
      const tracks = mediaRecorderRef.current.stream?.getTracks();
      tracks?.forEach(track => track.stop());
    });
  }, [toast]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      return await stopRecording();
    } else {
      await startRecording();
      return null;
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
