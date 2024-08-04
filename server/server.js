const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // Import CORS

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors()); // Use CORS middleware

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('drawing', (data) => {
        const { tool } = data;
        const room = Object.keys(socket.rooms).find(r => r !== socket.id);
        if (room) {
            socket.to(room).emit('drawing', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(4000, () => {
    console.log('Server running on port 4000');
});

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});
