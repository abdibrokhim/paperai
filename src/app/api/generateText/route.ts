// src/app/api/generateText/route.ts

import { NextResponse } from 'next/server';
import { getAccessToken } from '../../../lib/ibmAuth';

export async function POST(request: Request) {
  try {
    const { input } = await request.json();

    const url = process.env.NEXT_PUBLIC_IBM_API_URL;
    const projectId = process.env.NEXT_PUBLIC_IBM_PROJECT_ID;

    if (!url || !projectId) {
      return NextResponse.json(
        { error: 'Missing environment variables.' },
        { status: 500 }
      );
    }

    // Function to perform the generate text request
    const generateText = async (token: string) => {
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const body = {
        input: `<|system|>
You are Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior. You always respond to greetings (for example, hi, hello, g'day, morning, afternoon, evening, night, what's up, nice to meet you, sup, etc) with "Hello! I am Granite Chat, created by IBM. How can I help you today?". Please do not say anything else and do not start a conversation.
<|user|>
${input}
`,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 900,
          min_new_tokens: 0,
          stop_sequences: [],
          repetition_penalty: 1.05,
        },
        model_id: 'ibm/granite-13b-chat-v2',
        project_id: projectId,
      };

      const response = await fetch(url, {
        headers,
        method: 'POST',
        body: JSON.stringify(body),
      });

      return response;
    };

    // Obtain the current access token
    let accessToken = await getAccessToken();

    // First attempt
    let response = await generateText(accessToken);

    // If unauthorized, fetch a new token and retry once
    if (response.status === 401) {
      console.warn('Access token expired or invalid. Fetching a new token and retrying...');
      accessToken = await getAccessToken(); // This will fetch a new token if the previous one is invalid
      response = await generateText(accessToken);
    }

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: 'Non-200 response from IBM API', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}