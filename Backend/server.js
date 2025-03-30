const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { Server } = require('socket.io');
const fs = require('node:fs');
const { Op } = require('sequelize');

const aiRoutes = require('./aiRoutes');

// Create the express app
const app = express();
app.use(express.json()); // Add this line to parse JSON request bodies
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    }
});

app.use('/api/ai', aiRoutes); // Mount the AI routes under /api/ai

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

//add a test route that takes a string and then asks the AI to generate a response
app.get(`/test/:prompt`, async (req, res) => {
    const prompt = req.params.prompt;
    if (!prompt) {
        return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    const result = await aiRoutes.generateResponse(prompt);
    console.log(result.response);
    res.send(result.response);
});