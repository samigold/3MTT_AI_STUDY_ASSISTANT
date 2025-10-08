const promptService = require("./promptService");

const openAIService = require("./openAiService");

const { parserService } = require("./parserService");

const QuestionGeneratorService = {


    generateQuestions: async (course, topic, options = {}) => {
        const { isMultipleChoice = false, questionCount = 5}  = options;

        // Here you would integrate with your AI service to generate questions

        try {
            let prompt;
            if (isMultipleChoice) {
                prompt = await promptService.buildMultipleChoice(course, topic, questionCount);
            } else {
                prompt = await promptService.buildOpenEnded(course, topic, questionCount);
            }

            // Call your AI service with the constructed prompt
            const response = await openAIService.generateContent(prompt);

            const  questions = parserService.validateAndParse(response);

            return questions;
        } catch (error) {
            console.error("Error generating questions:", error);
            throw new Error("Failed to generate questions");
        }
    },
};

module.exports = { QuestionGeneratorService };