const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https:https://ayushkatiyar13.github.io/testing/",
    methods: ["GET", "POST"],
    credentials: true,
  },
});


app.use(cors({ origin: "https:https://ayushkatiyar13.github.io/testing/", credentials: true }));

let drawingHistory = {}; // Store drawing history for each session

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session: ${sessionId}`);

    if (!drawingHistory[sessionId]) {
      drawingHistory[sessionId] = { history: [], redoStack: [] };
    }

    // Send existing history to the newly joined user
    socket.emit("drawingHistory", drawingHistory[sessionId].history);
  });

  // Handle audio status updates
  socket.on("audioStatus", ({ sessionId, status }) => {
    console.log(`User ${socket.id} has turned ${status} their audio.`);
    if (sessionId) {
      socket.to(sessionId).emit("audioStatus", { userId: socket.id, status });
    }
  });

  // Handle drawing data
  socket.on("drawing", (data) => {
    console.log("Received drawing data:", data);
    const { sessionId, tool } = data;

    if (!drawingHistory[sessionId]) {
      drawingHistory[sessionId] = { history: [], redoStack: [] };
    }

    if (tool === "undo") {
      const lastAction = drawingHistory[sessionId].history.pop();
      if (lastAction) {
        drawingHistory[sessionId].redoStack.push(lastAction);
        io.to(sessionId).emit("drawing", { tool: "undo", sessionId });
      }
    } else if (tool === "redo") {
      const redoAction = drawingHistory[sessionId].redoStack.pop();
      if (redoAction) {
        drawingHistory[sessionId].history.push(redoAction);
        io.to(sessionId).emit("drawing", {
          tool: "redo",
          sessionId,
          ...redoAction,
        });
      }
    } else if (tool === "reset") {
      drawingHistory[sessionId] = { history: [], redoStack: [] };
      io.to(sessionId).emit("drawing", data);
    } else {
      // Normal drawing action
      drawingHistory[sessionId].history.push(data);
      drawingHistory[sessionId].redoStack = []; // Clear redo stack on new action
      io.to(sessionId).emit("drawing", data);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start the server
server.listen(4000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:4000");
});

app.get("/test", (req, res) => {
  res.send("Server is up and running!");
});
