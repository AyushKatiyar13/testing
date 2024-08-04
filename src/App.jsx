import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const socket = io('http://localhost:4000', {
  withCredentials: true,
  transports: ['websocket']
});

const Whiteboard = ({ sessionId }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState('pencil');
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);

    const setCanvasSize = () => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    useEffect(() => {
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        socket.emit('join', sessionId);
        console.log('Joining session:', sessionId);

        socket.on('drawing', (data) => {
            console.log('Received drawing data:', data);
            const ctx = canvasRef.current.getContext('2d');
            if (data.tool === 'pencil') {
                ctx.beginPath();
                ctx.moveTo(data.prevX, data.prevY);
                ctx.lineTo(data.x, data.y);
                ctx.stroke();
            } else if (data.tool === 'rectangle') {
                ctx.beginPath();
                ctx.rect(data.startX, data.startY, data.width, data.height);
                ctx.stroke();
            } else if (data.tool === 'circle') {
                ctx.beginPath();
                ctx.arc(data.startX, data.startY, data.radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        });

        return () => {
            window.removeEventListener('resize', setCanvasSize);
            socket.off('drawing');
        };
    }, [sessionId]);

    const startDrawing = (event) => {
        const { offsetX, offsetY } = event.nativeEvent;
        setStartX(offsetX);
        setStartY(offsetY);
        setIsDrawing(true);

        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (event) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = event.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');

        if (currentTool === 'pencil') {
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
            socket.emit('drawing', { 
                tool: 'pencil', 
                x: offsetX, 
                y: offsetY, 
                prevX: startX, 
                prevY: startY,
                sessionId 
            });
            setStartX(offsetX);
            setStartY(offsetY);
        } else if (currentTool === 'rectangle') {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.beginPath();
            ctx.rect(startX, startY, offsetX - startX, offsetY - startY);
            ctx.stroke();
        } else if (currentTool === 'circle') {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.beginPath();
            const radius = Math.sqrt(Math.pow(offsetX - startX, 2) + Math.pow(offsetY - startY, 2));
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentTool === 'rectangle') {
            socket.emit('drawing', { 
                tool: 'rectangle', 
                startX, 
                startY, 
                width: canvasRef.current.width - startX, 
                height: canvasRef.current.height - startY,
                sessionId
            });
        } else if (currentTool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(canvasRef.current.width - startX, 2) + 
                Math.pow(canvasRef.current.height - startY, 2)
            );
            socket.emit('drawing', { tool: 'circle', startX, startY, radius, sessionId });
        }
    };

    return (
        <div>
            <button onClick={() => setCurrentTool('pencil')}>Pencil</button>
            <button onClick={() => setCurrentTool('rectangle')}>Rectangle</button>
            <button onClick={() => setCurrentTool('circle')}>Circle</button>
            <canvas
                ref={canvasRef}
                style={{ display: 'block', backgroundColor: '#fff' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />
        </div>
    );
};

function App() {
    const [sessionId, setSessionId] = useState('');

    const generateLink = () => {
        const id = uuidv4();
        setSessionId(id);
        const link = `${window.location.origin}${window.location.pathname}?session=${id}`;
        window.prompt('Share this link with others:', link);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('session');
        if (id) {
            setSessionId(id);
        }

        socket.on('connect', () => {
            console.log('Connected to server with ID:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
        };
    }, []);

    return (
        <div className="App">
            {sessionId ? (
                <Whiteboard sessionId={sessionId} />
            ) : (
                <button onClick={generateLink}>Create New Whiteboard</button>
            )}
        </div>
    );
}

export default App;