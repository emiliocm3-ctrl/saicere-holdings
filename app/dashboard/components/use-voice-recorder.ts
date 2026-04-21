"use client";

import { useRef, useState, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "transcribing";

export function useVoiceRecorder(
  onTranscript: (text: string) => void,
  transcribeFn: (formData: FormData) => Promise<{ text: string | null; error: string | null }>,
) {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        if (chunks.current.length === 0) {
          setState("idle");
          return;
        }

        setState("transcribing");
        const blob = new Blob(chunks.current, { type: mimeType });
        const formData = new FormData();
        formData.append("audio", blob, `recording.${mimeType.includes("webm") ? "webm" : "mp4"}`);

        try {
          const result = await transcribeFn(formData);
          if (result.text) {
            onTranscript(result.text);
          }
        } catch {
          // silently fail
        }

        setState("idle");
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setState("idle");
    }
  }, [onTranscript, transcribeFn]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  return { state, startRecording, stopRecording };
}
