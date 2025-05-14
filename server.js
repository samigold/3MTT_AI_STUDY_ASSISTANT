const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/ask', async (req, res) => {
  const { course, question } = req.body;

  if (!course || !question) {
    return res.status(400).json({ error: 'Course and question are required.' });
  }

  try {
    const prompt = `You are an AI tutor. Provide a simple explanation for the following topic/question related to ${course}: "${question}". Also, generate 2-3 practice questions.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0].message.content;
    const [explanation, ...questions] = content.split('\n').filter(line => line.trim() !== '');

    res.json({ explanation, questions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch response from OpenAI.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});