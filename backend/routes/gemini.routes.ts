import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

router.post('/api/gemini/generate-description', async (req, res) => {
  try {
    const { name, category } = req.body;
    
    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Write a short, engaging, and professional product description for a homemade product. 
      Name: ${name}
      Category: ${category}
      Make it appealing to buyers, highlighting quality and care. Limit to 3 sentences.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      res.json({ description: response.text });
    } else {
      // Mocked response if no API key is present
      const mockDescription = `Experience the finest quality with our ${name}. Carefully crafted in the ${category} category, it brings authentic flavors and a touch of home right to your doorstep. Perfect for those who appreciate genuine, homemade excellence.`;
      
      setTimeout(() => {
        res.json({ description: mockDescription });
      }, 1000);
    }
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: 'Failed to generate description' });
  }
});

router.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const systemPrompt = `You are "Craffle Assistant", a friendly AI chatbot for Craffle (a platform connecting local, home-based creators with nearby customers). 
    Help users discover homemade products (cakes, pickles, snacks, crafts), explain how the app works, and answer questions.
    Keep your answers concise, warm, helpful, and under 3-4 sentences.`;

    if (process.env.GEMINI_API_KEY) {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood! I'll act as the Craffle Assistant." }] },
        ...(history || []).map((h: any) => ({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });

      res.json({ reply: response.text });
    } else {
      // Smart Mock responses
      const text = (message || '').toLowerCase();
      let reply = "I'm the Craffle Assistant! I can help you find homemade cakes, pickles, snacks, and crafts near you. How can I help you today?";
      
      if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
        reply = "Hello there! Welcome to Craffle. I'm your assistant. What kind of homemade goodies are you looking for today?";
      } else if (text.includes('how it works') || text.includes('how does it work')) {
        reply = "Craffle connects local home-based creators with nearby customers. You can browse products, place delivery orders, or request a Self Pickup if you're within 10 km of the seller!";
      } else if (text.includes('pickup') || text.includes('self-pickup') || text.includes('limit')) {
        reply = "Self Pickup lets you pick up your order directly from the creator! If the product is accessed from the 'Nearby' tab, there are no distance restrictions. For homepage products, it is limited to 10 km.";
      } else if (text.includes('cancel')) {
        reply = "You can cancel any order as long as its status is 'Pending'. Just click on the order under 'My Orders' and select the Cancel option!";
      } else if (text.includes('wishlist')) {
        reply = "You can add products to your wishlist by clicking the heart icon on cards. View and manage them under the 'Wishlist' tab at the top!";
      }
      
      setTimeout(() => {
        res.json({ reply });
      }, 500);
    }
  } catch (err) {
    console.error('Chat Gemini error:', err);
    res.status(500).json({ error: 'Failed to chat' });
  }
});

export default router;
