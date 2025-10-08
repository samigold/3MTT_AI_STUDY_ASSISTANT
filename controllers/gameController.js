const { QuestionGeneratorService } = require('../services/questionGenService');

// Generate questions for the guessing game using AI
async function generateAIQuestions(course, topic, isMultipleChoice = false, questionCount = 5) {
  try {
    const questions = await QuestionGeneratorService.generateQuestions(
      course, 
      topic, 
      { isMultipleChoice, questionCount }
    );

    // Handle the case where no questions were generated
    if (!questions || questions.length === 0) {
      console.error("No questions were generated in the response");
      
      // Provide a fallback question (maintaining original behavior)
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
