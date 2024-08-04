import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './App.css';

const socket = io('http://192.168.1.6:4000');

const Whiteboard = ({ sessionId }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentTool, setCurrentTool] = useState('pencil');
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);

    useEffect(() => {
        socket.emit('join', sessionId); // Join the session when component mounts

        socket.on('drawing', (data) => {
            const ctx = canvasRef.current.getContext('2d');
            if (data.tool === 'pencil') {
                ctx.lineTo(data.x, data.y);
                ctx.stroke();
            } else if (data.tool === 'rectangle') {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.beginPath();
                ctx.rect(data.startX, data.startY, data.width, data.height);
                ctx.stroke();
            } else if (data.tool === 'circle') {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.beginPath();
                ctx.arc(data.startX, data.startY, data.radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        });

        return () => {
            socket.off('drawing');
        };
    }, [sessionId]);

    const startDrawing = (event) => {
        const { offsetX, offsetY } = event.nativeEvent;
        setStartX(offsetX);
        setStartY(offsetY);
        setIsDrawing(true);
    };

    const draw = (event) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = event.nativeEvent;
        const ctx = canvasRef.current.getContext('2d');

        if (currentTool === 'pencil') {
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();
            socket.emit('drawing', { tool: 'pencil', x: offsetX, y: offsetY });
        } else if (currentTool === 'rectangle') {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.beginPath();
            ctx.rect(startX, startY, offsetX - startX, offsetY - startY);
            ctx.stroke();
            socket.emit('drawing', { tool: 'rectangle', startX, startY, width: offsetX - startX, height: offsetY - startY });
        } else if (currentTool === 'circle') {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.beginPath();
            const radius = Math.sqrt(Math.pow(offsetX - startX, 2) + Math.pow(offsetY - startY, 2));
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
            socket.emit('drawing', { tool: 'circle', startX, startY, radius });
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const setCanvasSize = () => {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    useEffect(() => {
        setCanvasSize();
        window.addEventListener('resize', setCanvasSize);

        return () => {
            window.removeEventListener('resize', setCanvasSize);
        };
    }, []);

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
        window.prompt('Share this link with others:', `${window.location.href}?session=${id}`);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('session');
        if (id) {
            setSessionId(id);
        }
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
