import { openai } from "./client";

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "ogg";
  const uint8 = new Uint8Array(audioBuffer);
  const file = new File([uint8], `recording.${ext}`, { type: mimeType });

  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en",
  });

  return response.text;
}
