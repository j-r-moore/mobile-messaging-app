const socket = io();
const messagesElement = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const addName = document.getElementById('nameInput');
const nameButton = document.getElementById('setNameButton');
const usersElement = document.getElementById('users');
const nameElement = document.getElementById('name');

sendButton.addEventListener('click', sendMessage);
nameButton.addEventListener('click', setName);

//when the page loads, request the users from the server
socket.emit('getUsers');



socket.on('users', (users) => {
    usersElement.innerHTML = '';
    users.forEach((user) => {
        const userElement = document.createElement('div');
        userElement.textContent = user;
        usersElement.appendChild(userElement);
    });
});


function setName() {
    const name = addName.value.trim();
    if (name !== '') { 
        socket.emit('name', name);
        console.log(name);        
        nameElement.innerHTML = 'Welcome ' + name;
        nameElement.style.color = 'green';
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message !== '') {
        socket.emit('message', message, addName.value);
        messageInput.value = '';
        console.log(addName.value);
    }
}


socket.on('message', (message, name) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = message + ' - ' + name;
    messagesElement.appendChild(messageElement);
});

socket.on('getMessages', (name) => {
    socket.emit('getMessages', name);
});

socket.on('messages', (messages) => {
    messagesElement.innerHTML = 'Welcome ' + addName.value + '<br>';
    messagesElement.innerHTML += 'Messages:<br>';
    console.error('Messages:', messages);
    messages.forEach((message) => {
        const messageElement = document.createElement('div');
        messageElement.textContent = message + ' - ' + addName.value;
        messagesElement.appendChild(messageElement);
    });
});
socket.on('name', (name) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = 'Welcome ' + name;
    messagesElement.appendChild(messageElement);
});


// Store current AI suggestions
let currentAiSuggestions = [];

// Listen for AI suggestions
socket.on('aiSuggestions', (data) => {
    try {
        console.log('AI data received:', data);
        
        // Handle different response formats
        let suggestions = [];
        
        if (data.suggestions && data.suggestions.response) {
            // Try to extract suggestions based on the structure
            const responseData = data.suggestions.response;
            
            if (responseData.candidates && responseData.candidates[0] && 
                responseData.candidates[0].content && responseData.candidates[0].content.parts) {
                // Extract from Gemini/PaLM style response
                const responseText = responseData.candidates[0].content.parts[0].text;
                
                // Try different parsing approaches
                if (responseText.includes('response: ')) {
                    console.log('Gemini/PaLM response detected:', responseText);
                    suggestions = responseText.split('response: ')[1].split('\n')
                        .map(s => s.trim())
                        .filter(s => s !== '');
                } else if (responseText.includes('[') && responseText.includes(']')) {
                    // Try to parse as JSON array
                    console.log('Attempting to parse JSON:', responseText);
                    try {
                        const jsonStr = responseText.substring(
                            responseText.indexOf('['),
                            responseText.lastIndexOf(']') + 1
                        );
                        suggestions = JSON.parse(jsonStr);
                    } catch (e) {
                        // If JSON parsing fails, try simple line splitting
                        console.log('JSON parsing failed, falling back:', e);
                        suggestions = responseText.split('\n')
                            .map(s => s.trim())
                            .filter(s => s.length > 0 && !s.startsWith('[') && !s.endsWith(']'));
                    }
                } else {
                    // Simple line splitting as fallback
                    console.log('Fallback to line splitting:', responseText);
                    suggestions = responseText.split('\n')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);
                }
            }
        } else if (typeof data.suggestions === 'string') {
            // Direct string response
            console.log('String response:', data.suggestions);
            suggestions = data.suggestions.split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0);
        } else if (Array.isArray(data.suggestions)) {
            // Already an array
            console.log('Array of suggestions:', data.suggestions);
            suggestions = data.suggestions;
        }
        
        // Fallback if no suggestions were extracted
        if (suggestions.length === 0) {
            suggestions = ["I understand.", "Tell me more.", "That's interesting!"];
            console.log("Using fallback suggestions");
        }
        
        console.log('Parsed suggestions:', suggestions);
        
        // Store for later use
        currentAiSuggestions = suggestions;
        
        // Clear previous suggestions
        const suggestionsContainer = document.getElementById('ai-suggestions');
        suggestionsContainer.innerHTML = '';
        
        // Add a header
        const header = document.createElement('div');
        header.className = 'suggestions-header';
        header.textContent = `Suggested replies to ${data.sender}:`;
        suggestionsContainer.appendChild(header);
        
        // Add each suggestion as a clickable button
        suggestions.forEach((suggestion, index) => {
            const suggestionBtn = document.createElement('button');
            suggestionBtn.className = 'suggestion-btn';
            suggestionBtn.textContent = suggestion.response || suggestion;
            suggestionBtn.addEventListener('click', () => {
                sendAiResponse(suggestion.response || suggestion, addName.value);
                console.log('Sending AI response:', suggestion.response || suggestion, 'to', data.sender);
                // Clear suggestions after selection
                suggestionsContainer.innerHTML = '';
            });
            suggestionsContainer.appendChild(suggestionBtn);
        });
        
        // Show the suggestions container
        suggestionsContainer.style.display = 'block';
    } catch (error) {
        console.error('Error handling AI suggestions:', error);
        console.error('Error details:', error.message);
        console.error('Data received:', JSON.stringify(data, null, 2));
    }
});

// Function to send the selected AI response
function sendAiResponse(responseText, originalSender) {
    socket.emit('sendAiResponse', responseText, originalSender);
}