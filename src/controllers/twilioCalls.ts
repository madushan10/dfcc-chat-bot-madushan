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
import { PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const twilioVoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

export const twilioResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const recordingSid = req.body.RecordingSid as string;
    console.log(`Recording SID: ${recordingSid}`);
    const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN as string;

    // const recordingUrl = https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3;
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`;

    const response = await fetch(recordingUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recording: ${response.statusText}`);
    }

    const audioBuffer = await response.buffer();

    const convertedAudioBuffer = await convertAudio(audioBuffer);

    const filename = 'recording.mp3';
    const file = new File([convertedAudioBuffer], filename, { type: 'audio/mp3' });

    const transcriptionResponse = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    });

    if (!transcriptionResponse.text) {
      throw new Error('Transcription failed or resulted in empty text');
    }

    const transcription = transcriptionResponse.text;
    console.log(`Transcription: ${transcription}`);

    const twimlResponse = new twiml.VoiceResponse();
    twimlResponse.say(transcription);

    res.type('text/xml');
    res.send(twimlResponse.toString());
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

async function convertAudio(audioBuffer: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();
    const data: Buffer[] = [];

    outputStream.on('data', chunk => data.push(chunk));
    outputStream.on('end', () => resolve(Buffer.concat(data)));
    outputStream.on('error', error => {
      console.error('Output stream error:', error);
      reject(error);
    });

    inputStream.end(audioBuffer);

    ffmpeg(inputStream)
      .on('error', (error) => {
        console.error('ffmpeg error:', error);
        reject(error);
      })
      .toFormat('mp3')
      .pipe(outputStream);
  });
}



// async function convertAudio(audioBuffer: Buffer, _targetFormat: string): Promise<Buffer> {
//   const encoder = new Lame({
//     output: 'buffer', // output as a Buffer
//     bitrate: 128,
//     raw: true,
//   }).setBuffer(audioBuffer);

//   try {
//     await encoder.encode();
//     return encoder.getBuffer();
//   } catch (error) {
//     throw new Error(`Audio conversion failed: ${error.message}`);
//   }
// }