const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate questions for the guessing game using AI
async function generateAIQuestions(course, topic, isMultipleChoice = false, questionCount = 5) {
  try {
    let prompt;
      if (isMultipleChoice) {
      prompt = `Create ${questionCount} challenging multiple-choice questions about ${topic} in the context of ${course}.
      
For each question:
- Provide a clear, specific question
- Provide exactly 3 options (A, B, C)
- Only one option should be correct
- Make the options plausible but clearly distinguishable
- Make the questions interesting and educational - they should test knowledge about ${topic}

Your response must be a valid JSON object with the following structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option 1", "Option 2", "Option 3"],
      "correctOption": 0,
      "explanation": "Optional explanation"
    },
    ...more questions
  ]
}

Examples:
1. Question: "Which programming language was created by Brendan Eich in 1995?"
   Options: ["Java", "JavaScript", "Python"]
   Correct Option: 1 (JavaScript)

2. Question: "Which CSS property creates space between elements' borders?"
   Options: ["padding", "margin", "border-spacing"]
   Correct Option: 1 (margin)

Make the questions of medium to hard difficulty for someone learning ${course}, specifically about ${topic}.`;    } else {
      prompt = `Create ${questionCount} challenging "guess the answer" questions about ${topic} in the context of ${course}.
      
For each question, provide a clear question that has a specific single-word or short phrase answer.
Make the questions interesting and educational - they should test knowledge about ${topic}.

Your response must be a valid JSON object with the following structure:
{
  "questions": [
    {
      "question": "Question text here",
      "answer": "Short answer here"
    },
    ...more questions
  ]
}

Examples:
1. "What programming language was created by Brendan Eich in 1995 that's now used for web development?" Answer: "JavaScript"
2. "What's the CSS property used to create space between elements' borders?" Answer: "margin"
3. "What HTTP status code represents 'Not Found'?" Answer: "404"

Make sure each question has a straightforward, unambiguous answer. The questions should be of medium to hard difficulty for someone learning ${course}, specifically about ${topic}.`;
    }    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'You are a question generator that outputs valid JSON. You will always respond with a JSON object that has a "questions" property containing an array of question objects.'
        },
        { 
          role: 'user', 
          content: prompt 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });const content = response.choices[0].message.content;
    
    // Add safer JSON parsing with error handling
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError);
      console.log("Received content:", content);
      // If we can't parse the response, return a fallback question
      return isMultipleChoice ? 
        [{
          question: `What is a key concept in ${topic}?`,
          options: ["Concept A", "Concept B", "Concept C"],
          correctOption: 0
        }] : 
        [{
          question: `What is a key concept in ${topic}?`,
          answer: "It varies"
        }];
    }
    
    // The API response might have the questions in parsedContent.questions or directly in parsedContent
    let questions = [];
    
    if (parsedContent && Array.isArray(parsedContent.questions)) {
      // Response has a questions property that is an array
      questions = parsedContent.questions;
    } else if (parsedContent && Array.isArray(parsedContent)) {
      // Response is directly an array
      questions = parsedContent;
    }
    
    // Ensure we have at least one question
    if (questions.length === 0) {
      console.error("No questions were generated in the response:", parsedContent);
      
      // Provide a fallback question
      if (isMultipleChoice) {
        return [{
          question: `What is a key concept in ${topic}?`,
          options: ["Concept A", "Concept B", "Concept C"],
          correctOption: 0
        }];
      } else {
        return [{
          question: `What is a key concept in ${topic}?`,
          answer: "It varies"
        }];
      }
    }
    
    return questions;
  } catch (error) {
    console.error("Error generating game questions:", error);
    return [];
  }
}

module.exports = {
  generateAIQuestions
};
