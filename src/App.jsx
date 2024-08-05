import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import "./App.css";
import AudioCommunication from "./AudioCommunication";

// Replace with your server URL
const socket = io("https://ayushkatiyar13.github.io/testing/", {
  withCredentials: true,
  transports: ["websocket"],
});

const Whiteboard = ({ sessionId }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState("pencil");
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [actions, setActions] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const setCanvasSize = () => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  useEffect(() => {
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    socket.emit("join", sessionId);
    console.log("Joining session:", sessionId);

    socket.on("drawing", (data) => {
      const ctx = canvasRef.current.getContext("2d");
      if (data.tool === "reset") {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setActions([]);
        setRedoStack([]);
      } else if (data.tool === "undo") {
        handleUndoRedraw(ctx);
      } else if (data.tool === "redo") {
        handleRedoRedraw(ctx, data);
      } else {
        drawOnCanvas(ctx, data);
        setActions((prevActions) => [...prevActions, data]);
        setRedoStack([]);
      }
    });

    socket.on("drawingHistory", (history) => {
      const ctx = canvasRef.current.getContext("2d");
      history.forEach((data) => drawOnCanvas(ctx, data));
      setActions(history);
    });

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      socket.off("drawing");
      socket.off("drawingHistory");
    };
  }, [sessionId]);

  const drawOnCanvas = (ctx, data) => {
    if (data.tool === "pencil") {
      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    } else if (data.tool === "rectangle") {
      ctx.beginPath();
      ctx.rect(data.startX, data.startY, data.width, data.height);
      ctx.stroke();
    } else if (data.tool === "circle") {
      ctx.beginPath();
      ctx.arc(data.startX, data.startY, data.radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const handleUndoRedraw = (ctx) => {
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    const newActions = actions.slice(0, -1);
    newActions.forEach((action) => drawOnCanvas(ctx, action));
    setActions(newActions);
    setRedoStack((prevStack) => [...prevStack, actions[actions.length - 1]]);
  };

  const handleRedoRedraw = (ctx, redoData) => {
    drawOnCanvas(ctx, redoData);
    setActions((prevActions) => [...prevActions, redoData]);
    setRedoStack((prevStack) => prevStack.slice(0, -1));
  };

  const startDrawing = (event) => {
    const { offsetX, offsetY } = event.nativeEvent;
    setStartX(offsetX);
    setStartY(offsetY);
    setIsDrawing(true);

    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const draw = (event) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = event.nativeEvent;
    const ctx = canvasRef.current.getContext("2d");

    const drawingData = {
      tool: currentTool,
      x: offsetX,
      y: offsetY,
      prevX: startX,
      prevY: startY,
      sessionId,
    };

    if (currentTool === "pencil") {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (currentTool === "rectangle") {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.beginPath();
      ctx.rect(startX, startY, offsetX - startX, offsetY - startY);
      ctx.stroke();
      drawingData.width = offsetX - startX;
      drawingData.height = offsetY - startY;
    } else if (currentTool === "circle") {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.beginPath();
      const radius = Math.sqrt(
        Math.pow(offsetX - startX, 2) + Math.pow(offsetY - startY, 2)
      );
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      drawingData.radius = radius;
    } else if (currentTool === "eraser") {
      ctx.clearRect(offsetX - 10, offsetY - 10, 20, 20);
    }

    socket.emit("drawing", drawingData);
    setStartX(offsetX);
    setStartY(offsetY);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleReset = () => {
    socket.emit("drawing", { tool: "reset", sessionId });
  };

  const handleUndo = () => {
    socket.emit("drawing", { tool: "undo", sessionId });
  };

  const handleRedo = () => {
    socket.emit("drawing", { tool: "redo", sessionId });
  };

  return (
    <div>
      <button onClick={() => setCurrentTool("pencil")}>Pencil</button>
      <button onClick={() => setCurrentTool("rectangle")}>Rectangle</button>
      <button onClick={() => setCurrentTool("circle")}>Circle</button>
      <button onClick={() => setCurrentTool("eraser")}>Eraser</button>
      <button onClick={handleUndo}>Undo</button>
      <button onClick={handleRedo}>Redo</button>
      <button onClick={handleReset}>Reset</button>
      <canvas
        ref={canvasRef}
        style={{ display: "block", backgroundColor: "#fff" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
    </div>
  );
};

function App() {
  const [sessionId, setSessionId] = useState("");

  const generateLink = () => {
    const id = uuidv4();
    setSessionId(id);
    const link = `${window.location.origin}${window.location.pathname}?session=${id}`;
    window.prompt("Share this link with others:", link);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session");
    if (id) {
      setSessionId(id);
    }

    socket.on("connect", () => {
      console.log("Connected to server with ID:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  return (
    <div className="App">
      {sessionId ? (
        <>
          <Whiteboard sessionId={sessionId} />
          <AudioCommunication sessionId={sessionId} />
        </>
      ) : (
        <button onClick={generateLink}>Create New Whiteboard</button>
      )}
    </div>
  );
}

export default App;
