const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const openAIService = {

    generateContent: async (prompt) => {
        try{
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                { role: 'system',
                    content: 'You are a helpful assistant that always responds with valid JSON. You will always respond with a JSON object that has a "questions" property containing an array of question objects.' 
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 2000
        });
        return response.choices[0].message.content;
    }
    catch (error) {
        console.error("Error generating content:", error);
        throw error;
    }
    }
};

module.exports = { openAIService };