import React, { useState } from "react";
import axios from "axios";

 
interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

interface AudioStreamProps {
  voiceId: string;
  apiKey: string;
  voiceSettings: VoiceSettings;
}

const AudioStream: React.FC<AudioStreamProps> = ({
  voiceId,
  apiKey,
  voiceSettings,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userSpeech, setUserSpeech] = useState("");

  
  const startStreaming = async (text: string) => {
    setLoading(true);
    setError("");

    const baseUrl = "https://api.elevenlabs.io/v1/text-to-speech";
    const headers = {
      "Content-Type": "application/json",
      "xi-api-key": "",
    };

    const requestBody = {
      text,
      voice_settings: voiceSettings,
    };

    try {
      const response = await axios.post(`${baseUrl}/${voiceId}`, requestBody, {
        headers,
        responseType: "blob",
      });

      if (response.status === 200) {
        const audio = new Audio(URL.createObjectURL(response.data));
        audio.play();

         
        audio.onended = () => {
          
          startSpeechRecognition();
        };
      } else {
        setError("Error: Unable to stream audio.");
      }
    } catch (error) {
      setError("Error: Unable to stream audio.");
    } finally {
      setLoading(false);
    }
  };

  // Function to start speech recognition
  const startSpeechRecognition = () => {
    // Casting window as any to access webkitSpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setUserSpeech(speechResult); // Set the recognized speech
      console.log("User said: ", speechResult);

       
      respondToUser(speechResult);
    };

    recognition.onerror = (event: Event) => {
      setError("Error recognizing speech: " + event.type);
    };

    recognition.onend = () => {
       
      startSpeechRecognition();
    };

    recognition.start();
  };

   
  const respondToUser = (userInput: string) => {
     
    const assistantResponse = `I heard you say: "${userInput}". How can I assist you further?`;

    startStreaming(assistantResponse);
  };

   
  const initiateConversation = () => {
    startStreaming("Hey,How have you been?");
  };

  return (
    <div className="p-4">
      <button
        onClick={initiateConversation}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        Start Conversation
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}

      {userSpeech && <p className="mt-2">You said: {userSpeech}</p>}
    </div>
  );
};

export default AudioStream;
