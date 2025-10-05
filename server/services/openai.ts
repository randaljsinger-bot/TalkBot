import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function createChatCompletion(messages: Array<{ role: string; content: string }>) {
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: messages as any,
    max_completion_tokens: 8192,
    stream: true,
  });

  return response;
}

export async function createSpeechFromText(text: string): Promise<Buffer> {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // Create a temporary file-like object from buffer
  const audioFile = new File([audioBuffer], "audio.wav", { type: "audio/wav" });
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
  });

  return transcription.text;
}
