const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

let drawingHistory = {}; // Store drawing history for each session

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session: ${sessionId}`);
    if (!drawingHistory[sessionId]) {
      drawingHistory[sessionId] = { history: [], redoStack: [] };
    }
    // Send existing history to the newly joined user
    socket.emit('drawingHistory', drawingHistory[sessionId].history);
  });

  socket.on('drawing', (data) => {
    console.log('Received drawing data:', data);
    const sessionId = data.sessionId;
    
    if (data.tool === 'undo') {
      const lastAction = drawingHistory[sessionId].history.pop();
      if (lastAction) {
        drawingHistory[sessionId].redoStack.push(lastAction);
        io.to(sessionId).emit('drawing', { tool: 'undo', sessionId });
      }
    } else if (data.tool === 'redo') {
      const redoAction = drawingHistory[sessionId].redoStack.pop();
      if (redoAction) {
        drawingHistory[sessionId].history.push(redoAction);
        io.to(sessionId).emit('drawing', { tool: 'redo', sessionId, ...redoAction });
      }
    } else if (data.tool === 'reset') {
      drawingHistory[sessionId] = { history: [], redoStack: [] };
      io.to(sessionId).emit('drawing', data);
    } else {
      drawingHistory[sessionId].history.push(data);
      drawingHistory[sessionId].redoStack = []; // Clear redo stack on new action
      io.to(sessionId).emit('drawing', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});