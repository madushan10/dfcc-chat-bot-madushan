// import { Request, Response, NextFunction } from 'express';
// import OpenAI from "openai";
// import { Pinecone } from '@pinecone-database/pinecone'

// const VoiceResponse = require('twilio').twiml.VoiceResponse;
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// if (
//   !process.env.PINECONE_API_KEY ||
//   typeof process.env.PINECONE_API_KEY !== "string"
// ) {
//   throw new Error("Pinecone API key is not defined or is not a string.");
// }
// const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
// const index = pc.index("botdb");
// const namespace = index.namespace("dfcc-vector-db");

// export const twilioVoice = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         res.type('xml');
//             const twiml = new  VoiceResponse();
//             twiml.say("Hello, This is dfcc chat bot");
//             const gather = twiml.gather({
//                 input : "speech",
//                 action : "/twilio-results",
//                 language : "en-US",
//                 speechModel : "phone_call"
//             })
//             gather.say(" Please ask your question");
//         return res.send(twiml.toString());
//       } catch (error) {
//         console.error(error);
//         return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
//       }
// };

// export const twilioResults = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         //console.log(req.body);
//         const user_question = req.body.SpeechResult;
//         const embedding = await openai.embeddings.create({
//             model: "text-embedding-ada-002",
//             input: user_question,
//         });

//         console.log("user_question",user_question);

//         //console.log("embedding",embedding.data[0].embedding);

//         const queryResponse = await namespace.query({
//             vector: embedding.data[0].embedding,
//             topK: 2,
//             includeMetadata: true,
//         });

//         const results: string[] = [];
//         queryResponse.matches.forEach((match) => {
//             if (match.metadata && typeof match.metadata.Title === "string") {
//               const result = `Title: ${match.metadata.Title}, \n Content: ${match.metadata.Text} \n \n `;
//               results.push(result);
//             }
//           });
//         let context = results.join("\n");

//         console.log("context", context);
//         const questionRephrasePrompt = `You are a helpful assistant and you are friendly. 
//         if user greet you you will give proper greeting in friendly manner. Your name is DFCC GPT.
//         Answer ${user_question} Only based on given Context: ${context}, your answer must be less than 150 words. 
//         If the user asks for information like your email or address, you'll provide DFCC email and address. 
//         If answer has list give it as numberd list. If it has math question relevent to given Context give calculated answer, 
//         If user question is not relevent to the Context just say "I'm sorry.. no information documents found for data retrieval.". 
//         Do NOT make up any answers and questions not relevant to the context using public information.`;

//         const final_answer = await openai.completions.create({
//             model: "gpt-3.5-turbo-instruct",
//             prompt: questionRephrasePrompt,
//             max_tokens: 180,
//             temperature: 0,
//         });
//         res.type('xml');
//         const twiml = new  VoiceResponse();
//         twiml.say(final_answer.choices[0].text);
//         return res.send(twiml.toString());
//       } catch (error) {
//         console.error(error);
//         return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
//       }
// };
import { Request, Response, NextFunction } from 'express';
import { Twilio, twiml } from 'twilio';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import FormData from 'form-data';
const lame = require('node-lame').lame;

const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const twilioVoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = new twiml.VoiceResponse();
    response.say('Hello, please speak after the beep. Press any key when you are done.');
    response.record({
        action: '/twilio-results',
        method: 'POST',
        finishOnKey: '*',
        maxLength: 60
    });
    response.say('Recording completed. Please wait while we process your request.');

    res.type('text/xml');
    res.send(response.toString());
    } catch (error) {
      console.error(error);
      return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

export const twilioResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordingSid = req.body.RecordingSid;
    console.log(`Recording SID: ${recordingSid}`);

    // Fetch the recording using Twilio SDK
    const recording = await twilioClient.recordings(recordingSid).fetch();

    // Now you can access the recording URL and other details
    const recordingUrl = recording.uri;
    console.log(`Recording URL: ${recordingUrl}`);

    // Construct absolute URL using Twilio API base URL and relative path
    const absoluteUrl = `https://api.twilio.com${recordingUrl}`;

    // Fetch the audio recording data
    const audioResponse = await fetch(absoluteUrl);

    // Ensure successful audio retrieval
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio recording: ${audioResponse.statusText}`);
    }

    // Handle different audio data formats
    const audioBlob = await audioResponse.buffer(); // Use buffer() to get binary data

    // Audio format conversion (if applicable)
    const convertedAudioBlob = await convertAudio(audioBlob, 'mp3'); 

    // Create a File object for OpenAI
    const filename = 'recording.mp3'; // Assuming it's MP3 format after conversion
    const file = new File([convertedAudioBlob], filename, { type: 'audio/mp3' });

    // OpenAI transcription with error handling
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1', // Adjust as needed
      language: 'en',
    });

    if (!transcriptionResponse.text) {
      throw new Error('Transcription failed or resulted in empty text');
    }

    const transcription = transcriptionResponse.text;
    console.log(`Transcription: ${transcription}`);

    // Twilio response with transcription
    const twimlResponse = new twiml.VoiceResponse();
    twimlResponse.say(transcription);

    res.type('text/xml');
    res.send(twimlResponse.toString());
  } catch (error) {
    console.error(error);
    let errorMessage = 'Internal Server Error';
    res.status(500).json({ status: 'error', message: errorMessage });
  }
};

async function convertAudio(audioBlob: Buffer, targetFormat: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const encoder = new lame({
      output: targetFormat, // Replace with 'mp3' or your target format
      channels: 1, // Adjust for mono or stereo
      bitRate: 128, // Adjust bitrate as needed
    });

    encoder.on('error', (error) => reject(error));

    const chunks = [];
    encoder.on('data', (chunk) => chunks.push(chunk));
    encoder.on('end', () => {
      const convertedBuffer = Buffer.concat(chunks);
      resolve(convertedBuffer);
    });

    // Write the audio data to the encoder
    encoder.end(audioBlob);
  });
}
