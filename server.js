const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('node:fs');
const { users, messages } = require('./dbObjects');
const { Op } = require('sequelize');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);


const aiRoutes = require('./aiRoutes');
app.use('/api/ai', aiRoutes); // Mount the AI routes under /api/ai
app.use(express.json());
app.use(express.static('public'));



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



io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });


    socket.on('id', async (id) => {
        //if it is from a already existing user, remove the old name and id, use the id to find the index of the name and remove it
        if (users.some(user => user.id === socket.id)) {
            users.splice(users.findIndex(user => user.id === socket.id), 1);
        }
        const user = await users.findOne({ where: { id } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        users.push({ id: socket.id, name: user.name });
        io.emit('users', users.map(user => user.name));
    });

    socket.on('name', async (name) => {
        //if it is from a already existing user, remove the old name and id, use the id to find the index of the name and remove it
        if (users.some(user => user.id === socket.id)) {
            users.splice(users.findIndex(user => user.id === socket.id), 1);
        }
        const user = await users.findOne({ where: { name } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        users.push({ id: socket.id, name: user.name });
        io.emit('users', users.map(user => user.name));
    });

    socket.on('message', async (message, name) => {
        const user = await users.findOne({ where: { name } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        const newMessage = await messages.create({ message, userId: user.id });
        io.emit('message', newMessage.message, name);
    });

    socket.on('getMessages', async (name) => {
        const user = await users.findOne({ where: { name } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        const userMessages = await messages.findAll({ where: { userId: user.id } });
        socket.emit('messages', userMessages.map(message => message.message));
    });

    socket.on('getUsers', async () => {
        const allUsers = await users.findAll();
        socket.emit('users', allUsers.map(user => user.name));
    });

    socket.on('getData', async () => {
        const allUsers = await users.findAll();
        const allMessages = await messages.findAll();
        socket.emit('data', { users: allUsers, messages: allMessages });
    });

});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
