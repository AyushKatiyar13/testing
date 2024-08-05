import React, { useState, useRef, useEffect } from "react";
import io from "socket.io-client";

// Replace with your server URL
const socket = io("http://192.168.1.6:4000", {
  withCredentials: true,
  transports: ["websocket"],
});

const AudioCommunication = ({ sessionId }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [audioStatusMessage, setAudioStatusMessage] = useState("");
  const localStreamRef = useRef(null);

  useEffect(() => {
    // Handle incoming audio status updates from the server
    socket.on("audioStatus", ({ userId, status }) => {
      setAudioStatusMessage(`User ${userId} has ${status} their audio.`);
    });

    // Cleanup on component unmount
    return () => {
      socket.off("audioStatus");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // Ensure this effect is correctly dependent on all external variables if any changes

  const startAudio = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("getUserMedia is available.");
    
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current.srcObject = stream;
        setIsAudioEnabled(true);
    
        socket.emit("audioStatus", { sessionId, status: "on" });
      } else {
        console.error("getUserMedia is not supported by this browser.");
        alert("Your browser does not support audio communication. Please use a modern browser.");
      }
    } catch (error) {
      console.error("Error accessing audio:", error);
      alert("Please enable microphone access to use audio communication.");
    }
  };
  

  const stopAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setIsAudioEnabled(false);
    socket.emit("audioStatus", { sessionId, status: "off" });
  };

  return (
    <div>
      <button onClick={isAudioEnabled ? stopAudio : startAudio}>
        {isAudioEnabled ? "Turn Off Audio" : "Turn On Audio"}
      </button>
      <p>{audioStatusMessage}</p>
    </div>
  );
};

export default AudioCommunication;
