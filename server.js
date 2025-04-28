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

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
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



io.on('connection', (socket) => {
    console.log('A user connected');
    console.log(`Socket ID: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });


    socket.on('id', async (id) => {
        // Create an array to store connected users if it doesn't exist
        if (!global.connectedUsers) {
            global.connectedUsers = [];
        }
        
        // Remove user from connected users array if they already exist
        global.connectedUsers = global.connectedUsers.filter(user => user.id !== socket.id);
        
        const user = await users.findOne({ where: { id } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        
        // Add to connected users array
        global.connectedUsers.push({ id: socket.id, name: user.name });
        
        io.emit('users', global.connectedUsers.map(user => user.name));
    });

    socket.on('name', async (name) => {
        console.log(`Name: ${name}`);
        
        // Create an array to store connected users if it doesn't exist
        if (!global.connectedUsers) {
            global.connectedUsers = [];
        }
        
        // Remove user from connected users array if they already exist
        global.connectedUsers = global.connectedUsers.filter(user => user.id !== socket.id);
        global.connectedUsers = global.connectedUsers.filter(user => user.name !== name);
        // Check if user exists in database
        let user = await users.findOne({ where: { name } });
        
        if (!user) {
            console.log(`User ${name} not found`);
            // Create a new user in database
            user = await users.create({ name, id: socket.id });
            console.log(`User ${name} created`);
        } else {
            console.log(`User ${name} found`);
            // Update the user's socket id in the database if needed
            await users.update({ id: socket.id }, { where: { name } });
        }
        
        // Add to connected users array
        global.connectedUsers.push({ id: socket.id, name: user.name });
        
        // Emit events
        io.emit('users', global.connectedUsers.map(user => user.name));
        socket.emit('name', name);
        socket.emit('getMessages', name);
    });

    socket.on('message', async (message, name) => {
        console.log(`Message: ${message} from ${name}`);
        const user = await users.findOne({ where: { name } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        const newMessage = await messages.create({ message, name: user.name });
        console.log(`New message: ${newMessage.message} from ${name}`);
        io.emit('message', newMessage.message, name);

        // Generate AI response suggestions
        generateAiResponse(message, name).then((response) => {
            console.log('AI response suggestions sent successfully:', response);
        }).catch((error) => {
            console.error('Error sending AI response suggestions:', error);
        });
    });

    socket.on('getMessages', async (name) => {
        const user = await users.findOne({ where: { name } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        // I have to fetch the messages from the database using a name and not the id 
        // because the id is changed when the user disconnects and reconnects
        // and the name is not changed. So I have to use the name to fetch the messages 
        // from the database.
        const userMessages = await messages.findAll({ where: { name: user.name } });
        console.log(`User messages: ${userMessages}`);
        socket.emit('messages', userMessages.map(message => message.message));
    });

    socket.on('getUsers', async () => {4
        const allUsers = await users.findAll();
        socket.emit('users', allUsers.map(user => user.name));
    });

    socket.on('getData', async () => {
        const allUsers = await users.findAll();
        const allMessages = await messages.findAll();
        socket.emit('data', { users: allUsers, messages: allMessages });
    });

    socket.on('sendAiResponse', async (response, sender) => {
        console.log(`AI response: ${response} from ${sender}`);
        const user = await users.findOne({ where: { name: sender } });
        if (!user) {
            return socket.emit('error', 'User not found');
        }
        const newMessage = await messages.create({ message: response, name: user.name });
        console.log(`New AI message: ${newMessage.message} from ${sender}`);
        io.emit('message', newMessage.message, sender);

        // Generate AI response suggestions
        generateAiResponse(response, sender).then((response) => {
            console.log('AI response suggestions sent successfully:', response);
        }).catch((error) => {
            console.error('Error sending AI response suggestions:', error);
        });
    });



});


// Function to generate AI response suggestions for a message
async function generateAiResponse(message, name) {
    console.log(`Message: ${message} from ${name}`);

    const recentMessages = await messages.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10
    });
    // Reverse to get chronological order
    const conversationContext = recentMessages.reverse().map(msg => `Name:${msg.name}:, Message:${msg.message}`).join('\n');
    // console.log('Conversation context:', conversationContext);
    // Generate multiple response suggestions
    const aiPrompt = `${conversationContext}\n\nGenerate 3 different possible responses to the latest message, formatted as a JSON array. You should not ask me for more context, you should just make a response for the user to pick nothing else. ALLWAYS have it set up like this 'response: ' and then the response:`;
    const aiResponse = await aiRoutes.generateResponse(aiPrompt);
    
    try {
        // Only send response options to the user who received the message (not the sender)
        // Find the recipient(s) by excluding the sender
        global.connectedUsers.forEach(connectedUser => {
            if (connectedUser.name !== name) {
                const recipientSocket = io.sockets.sockets.get(connectedUser.id);
                if (recipientSocket) {
                    recipientSocket.emit('aiSuggestions', {
                        originalMessage: message,
                        sender: name,
                        suggestions: aiResponse.response
                    });
                }
            }
        });
    } catch (error) {
        console.error('Error sending AI suggestions:', error);
    }
    return aiResponse.response;
}





const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
