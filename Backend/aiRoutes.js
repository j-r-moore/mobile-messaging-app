const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyC2NuH6MIsocOsTQ9edUiRIWKd7dyc8-dM");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// AI response generation function
const generateResponse = async (prompt) => {
    try {
        // Here you would typically call your AI API
        const response = await model.generateContent(prompt);
        return { success: true, response };
    }
    catch (error) {
        console.error('Error generating response:', error);
        return { success: false, message: 'Error generating response', error: error.message };
    }
};

// AI endpoints
router.post('/generate', async (req, res) => {
    try {
        const prompt = req.body.prompt;
        if (!prompt) {
            return res.status(400).json({ success: false, message: 'Prompt is required' });
        }
        
        const response = await generateResponse(prompt);
        res.json(response);
    } catch (error) {
        console.error('Error in AI generate endpoint:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Export both the router and the generateResponse function
router.generateResponse = generateResponse;

module.exports = router;