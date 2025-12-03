import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg'];

const createUploadMiddleware = (fieldName, allowedMimeTypes) => {
  const uploader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
      const mimetype = file.mimetype?.toLowerCase() ?? '';
      if (!allowedMimeTypes.includes(mimetype)) {
        return cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
      }
      cb(null, true);
    },
  }).single(fieldName);

  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) {
        const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`
          : err.message;
        return res.status(400).json({ message });
      }
      next();
    });
  };
};

const uploadImage = createUploadMiddleware('image', IMAGE_MIME_TYPES);
const uploadDocument = createUploadMiddleware('document', DOCUMENT_MIME_TYPES);
const uploadAudio = createUploadMiddleware('audio', AUDIO_MIME_TYPES);

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('GEMINI_API_KEY is not set. Please configure it before starting the server.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

const GEMINI_MODEL = 'gemini-2.5-flash';

app.use(express.json());
app.use(cors());

const isPromptValid = (prompt) => typeof prompt === 'string' && prompt.trim().length > 0;

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Gemini Flash API is running' });
});

app.post('/generate-text', async (req, res) => {
  try {
    const { prompt } = req.body ?? {};

    if (!isPromptValid(prompt)) {
      return res.status(400).json({ message: 'prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    res.status(200).json({ result: response.text });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/generate-from-image', uploadImage, async (req, res) => {
  try {
    const { prompt } = req.body ?? {};

    if (!isPromptValid(prompt)) {
      return res.status(400).json({ message: 'prompt is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'image file is required' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimetype = req.file.mimetype;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          type: 'text',
          text: prompt,
        },
        {
            inlineData: { data: base64Image, mimeType: mimetype },
        }
      ],
    });

    res.status(200).json({ result: response.text });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/generate-from-document', uploadDocument, async (req, res) => {
    try {
        const { prompt } = req.body ?? {};

        if (!isPromptValid(prompt)) {
            return res.status(400).json({ message: 'prompt is required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'document file is required' });
        }

        const base64Document = req.file.buffer.toString('base64');
        const mimetype = req.file.mimetype;
        
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {
                    type: 'text',
                    text: prompt ?? "Please summarize the content of the document.",
                },
                {
                    inlineData: { data: base64Document, mimeType: mimetype },
                }
            ],
        });

        res.status(200).json({ result: response.text });
    } catch (error) {
        console.error('Error generating from document:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/generate-from-audio', uploadAudio, async (req, res) => {
    try {
        const { prompt } = req.body ?? {};

        if (!isPromptValid(prompt)) {
            return res.status(400).json({ message: 'prompt is required' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'audio file is required' });
        }

        const base64Audio = req.file.buffer.toString('base64');
        const mimetype = req.file.mimetype;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                {
                    type: 'text',
                    text: prompt ?? "Please transcribe the audio content.",
                },
                {
                    inlineData: { data: base64Audio, mimeType: mimetype },
                }
            ],
        });

        res.status(200).json({ result: response.text });
    } catch (error) {
        console.error('Error generating from audio:', error);
        res.status(500).json({ message: error.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
