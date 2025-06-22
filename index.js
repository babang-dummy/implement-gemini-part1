const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {GoogleGenerativeAI} = require('@google/generative-ai');

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({model: 'gemini-1.5-flash'});

const upload = multer({dest: 'uploads/'});


app.post('/generate-text', async (req, res) => {
  const {prompt} = req.body;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({output: response.text()});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
})

const imageToGenerativePart = (filePath) => ({
  inlineData: {
    data: fs.readFileSync(filePath).toString('base64'),
    mimeType: 'image/webp',
  }
})

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  const prompt = req.body.prompt || 'Describe the image';
  const image = imageToGenerativePart(req.file.path);

  try {
    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    res.json({output: response.text()});
  } catch (error) {
    res.status(500).json({error: error.message});
  } finally { 
    fs.unlinkSync(req.file.path);
  }

})

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  const filePath = req.file.path;
  const buffer = fs.readFileSync(filePath);
  const base64Data = buffer.toString('base64');
  const mimeType = req.file.mimetype;

  try {
    const dicumentPart = {
      inlineData: {
        data: base64Data,
        mimeType,
      }
    }
    const result = await model.generateContent(['Analyze the document:', dicumentPart]);
    const response = await result.response;
    res.json({output: response.text()});
  } catch (error) {
    res.status(500).json({error: error.message});
  } finally {
    fs.unlinkSync(req.file.path);
  }
})

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
  const audioBuffer = fs.readFileSync(req.file.path);
  const base64Data = audioBuffer.toString('base64');
  const audioPart = {
    inlineData: {
      data: base64Data,
      mimeType: req.file.mimetype,
    }
  }
  
  try {
    const result = await model.generateContent(['Transcribe or Analyze the audio:', audioPart]);
    const response = await result.response;
    res.json({output: response.text()});
  } catch (error) {
    res.status(500).json({error: error.message});
  } finally {
    fs.unlinkSync(req.file.path);
  }
})

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});
