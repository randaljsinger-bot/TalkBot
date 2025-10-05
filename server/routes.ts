import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { createChatCompletion, createSpeechFromText, transcribeAudio } from "./services/openai";
import { insertMessageSchema } from "@shared/schema";
import multer from "multer";

// Configure multer for audio uploads
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat') {
          // Store user message
          const userMessage = await storage.createMessage({
            content: message.content,
            role: 'user',
            inputMethod: message.inputMethod || 'text',
            hasAudio: false,
          });
          
          // Broadcast user message
          ws.send(JSON.stringify({
            type: 'message',
            message: userMessage,
          }));
          
          // Get conversation history
          const history = await storage.getRecentMessages(10);
          const chatHistory = history.map(msg => ({
            role: msg.role,
            content: msg.content,
          }));
          
          // Send typing indicator
          ws.send(JSON.stringify({
            type: 'typing',
            isTyping: true,
          }));
          
          // Generate AI response
          const completion = await createChatCompletion(chatHistory);
          let aiResponseContent = '';
          
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            aiResponseContent += content;
            
            // Stream response chunks
            ws.send(JSON.stringify({
              type: 'chunk',
              content: content,
            }));
          }
          
          // Generate speech if requested
          let audioUrl = null;
          if (message.generateSpeech && aiResponseContent.trim()) {
            const audioBuffer = await createSpeechFromText(aiResponseContent);
            audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
          }
          
          // Store AI message
          const aiMessage = await storage.createMessage({
            content: aiResponseContent,
            role: 'assistant',
            inputMethod: 'text',
            hasAudio: !!audioUrl,
            audioUrl,
          });
          
          // Send complete response
          ws.send(JSON.stringify({
            type: 'complete',
            message: aiMessage,
          }));
          
          // Stop typing indicator
          ws.send(JSON.stringify({
            type: 'typing',
            isTyping: false,
          }));
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });
  
  // API Routes
  app.get('/api/messages', async (req, res) => {
    try {
      const messages = await storage.getRecentMessages(50);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });
  
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      const transcription = await transcribeAudio(req.file.buffer);
      res.json({ text: transcription });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });
  
  app.delete('/api/messages', async (req, res) => {
    try {
      await storage.clearMessages();
      res.json({ message: 'Messages cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear messages' });
    }
  });

  return httpServer;
}
