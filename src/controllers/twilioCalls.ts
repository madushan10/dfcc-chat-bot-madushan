import { Request, Response, NextFunction } from 'express';
const VoiceResponse = require('twilio').twiml.VoiceResponse;

export const twilioVoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.type('xml');
            const twiml = new  VoiceResponse();
            twiml.say("Hello, This is dfcc chat bot");
            const gather = twiml.gather({
                input : "speech",
                action : "/twilio-results",
                language : "en-US",
                speechModel : "phone_call"
            })
            gather.say(" Please ask your question");
        res.send(twiml.toString());
      } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
      }
};

export const twilioResults = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log(req.body);
        res.type('xml');
        const user_question = req.body.SpeechResult;
        const twiml = new  VoiceResponse();
        twiml.say(user_question);
        res.send(twiml.toString());
      } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
      }
};