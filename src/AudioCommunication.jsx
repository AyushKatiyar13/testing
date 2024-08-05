import React, { useState, useRef, useEffect } from "react";
import io from "socket.io-client";

const socket = io("https://66b10a69a22e2a3914ea36a6--peaceful-peony-bb07cc.netlify.app", {
  withCredentials: true,
  transports: ["websocket"],
});

const AudioCommunication = ({ sessionId }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [audioStatusMessage, setAudioStatusMessage] = useState("");
  const localStreamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    socket.on("audioStatus", ({ userId, status }) => {
      setAudioStatusMessage(`User ${userId} has ${status} their audio.`);
    });

    return () => {
      socket.off("audioStatus");
      if (localStreamRef.current) {
        const stream = localStreamRef.current.srcObject;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    };
  }, []);

  const startAudio = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("getUserMedia is available.");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current.srcObject = stream;
        setIsAudioEnabled(true);
        socket.emit("audioStatus", { sessionId, status: "on" });
        visualizeAudio();
      } else {
        console.error("getUserMedia is not supported by this browser.");
        alert("Your browser does not support audio communication. Please use a modern browser.");
      }
    } catch (error) {
      console.error("Error accessing audio:", error);
      alert("Please enable microphone access to use audio communication.");
    }
  };

  const visualizeAudio = () => {
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const stream = localStreamRef.current.srcObject;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasCtx.fillStyle = "rgb(0, 0, 255)";
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const stopAudio = () => {
    if (localStreamRef.current) {
      const stream = localStreamRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        localStreamRef.current.srcObject = null;
      }
    }
    setIsAudioEnabled(false);
    socket.emit("audioStatus", { sessionId, status: "off" });
  };

  return (
    <div>
      <button onClick={isAudioEnabled ? stopAudio : startAudio}>
        {isAudioEnabled ? "Turn Off Audio" : "Turn On Audio"}
      </button>
      <audio ref={localStreamRef} autoPlay muted />
      <p>{audioStatusMessage}</p>
      <canvas ref={canvasRef} width="300" height="100" style={{ border: "1px solid #000" }} />
    </div>
  );
};

export default AudioCommunication;
