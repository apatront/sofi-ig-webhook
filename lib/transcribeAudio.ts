type OpenAITranscriptionResponse = {
  text?: string;
};

function getAudioExtension(contentType: string | null) {
  if (!contentType) return "mp4";

  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("m4a")) return "m4a";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("ogg")) return "ogg";

  return "mp4";
}

export async function transcribeAudioFromUrl(
  audioUrl: string
): Promise<string> {
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const audioResponse = await fetch(audioUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!audioResponse.ok) {
    const errorBody = await audioResponse.text();

    throw new Error(
      `Failed to download Instagram audio. Status: ${audioResponse.status}. Body: ${errorBody}`
    );
  }

  const contentType =
    audioResponse.headers.get("content-type") || "audio/mp4";

  const audioBuffer = await audioResponse.arrayBuffer();

  if (audioBuffer.byteLength === 0) {
    throw new Error("Instagram audio file is empty");
  }

  const extension = getAudioExtension(contentType);
  const filename = `instagram-voice-note.${extension}`;

  const audioBlob = new Blob([audioBuffer], {
    type: contentType,
  });

  const formData = new FormData();

  formData.append("file", audioBlob, filename);
  formData.append("model", "gpt-4o-mini-transcribe");
  formData.append("language", "es");

  const transcriptionResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIKey}`,
      },
      body: formData,
    }
  );

  if (!transcriptionResponse.ok) {
    const errorBody = await transcriptionResponse.text();

    throw new Error(
      `OpenAI transcription failed. Status: ${transcriptionResponse.status}. Body: ${errorBody}`
    );
  }

  const transcription =
    (await transcriptionResponse.json()) as OpenAITranscriptionResponse;

  const text = transcription.text?.trim();

  if (!text) {
    throw new Error("OpenAI returned an empty transcription");
  }

  return text;
}