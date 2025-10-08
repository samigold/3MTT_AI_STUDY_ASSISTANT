
const promptService = {

    buildMultipleChoice: async (course, topic, questionCount) => {
        return `Create ${questionCount} challenging multiple-choice questions about ${topic} in the context of ${course}.
        
        For each question:
        - Provide a clear, specific question
        - Provide exactly 3 options (A, B, C)
        - Only one option should be correct
        - Make the options plausible but clearly distinguishable
        - Make the questions interesting and educational - they should test knowledge about ${topic}
        
        Your response must be a vlaid JSON
        object with the following structure:
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

        Make the questions of medium to hard
        difficulty for someone learning ${course}, specifically about ${topic}`
    },

    buildOpenEnded: async (course, topic, questionCount) => {
        return `Create ${questionCount} challenging "guess the answer" questions about ${topic} in the context of ${course}.
        
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
        1. Question: "What year was the Python programming language first released?"
           Answer: "1991"
           
        2. Question: "What does CSS stand for in web development?"
           Answer: "Cascading Style Sheets"
        
        Make the questions of medium to hard difficulty for someone learning ${course}, specifically about ${topic}.
        `
    }
}

module.exports = promptService;