// src/app/api/generate/route.ts
import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Ensure API_KEY is available
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY is not defined in environment variables");
}

const ai = new GoogleGenAI({ apiKey });

export async function POST(req: NextRequest) {
  try {
    const { message, animal } = await req.json();

    if (!message || !animal) {
      return NextResponse.json({ error: 'Message and animal are required' }, { status: 400 });
    }

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash-exp', // Or your preferred model
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
      history: [], // Fresh history for each request
    });

    const additionalInstructions = `
    Use a fun story about lots of ${animal} as a metaphor.
    Keep sentences short but conversational, casual, and engaging.
    Generate a cute, minimal illustration for each sentence with blackish grey ink on white background.
    No commentary, just begin your explanation.
    Keep going until you're done.`;

    const resultStream = await chat.sendMessageStream({
      message: message + additionalInstructions,
    });

    // Create a ReadableStream to send back to the client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of resultStream) {
            // Ensure chunk and its properties are defined before accessing
            if (chunk && chunk.candidates) {
              for (const candidate of chunk.candidates) {
                if (candidate && candidate.content && candidate.content.parts) {
                  for (const part of candidate.content.parts) {
                    // Send each part as a separate JSON object in the stream
                    controller.enqueue(encoder.encode(JSON.stringify(part) + '\n'));
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error during streaming:", error);
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Streaming error: ' + (error as Error).message }) + '\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' }, // Use ndjson for streaming JSON objects
    });

  } catch (e: any) {
    console.error("API Route Error:", e);
    const errorMessage = e.error?.message || e.message || 'An unknown error occurred';
    return NextResponse.json({ error: `Something went wrong on the server: ${errorMessage}` }, { status: 500 });
  }
}