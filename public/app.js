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

