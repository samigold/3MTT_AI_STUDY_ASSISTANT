require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

const getResult = async (req, res) => {
    const { course, question, explanationLevel } = req.body;

    if (!course || !question) {
      return res.status(400).json({ error: 'Course and question are required.' });
    }
  
    try {
      let explanationPrompt = "";
      if (explanationLevel === "simple") {
        explanationPrompt = `Explain the following topic related to ${course} as if you're explaining to a 5-year-old: "${question}". Keep it very simple and use analogies a child would understand.`;
      } else {
        explanationPrompt = `Provide an in-depth explanation for the following topic related to ${course}: "${question}". Include detailed information, technical concepts, and examples where appropriate.`;
      }
  
      const questionsPrompt = `Generate 5 multiple-choice questions related to ${question} in the context of ${course}. For each question, provide 4 options (A, B, C, D) and indicate the correct answer. Format the response as a JSON array with each object containing: question, options (array of 4 strings), and correctAnswer (index number 0-3).`;
  
      // Add prompt for generating resource links
      const resourcesPrompt = `Provide 3-5 high-quality external learning resources (articles, tutorials, documentation, videos) about "${question}" in the context of ${course}. Format the response as a JSON array with each object containing: title, url, and type (article, video, tutorial, documentation, or tool). Only include real, specific URLs that actually exist.`;
  
      // Make parallel API calls for all three requests
      const [explanationResponse, questionsResponse, resourcesResponse] = await Promise.all([
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: explanationPrompt }],
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: questionsPrompt }],
          response_format: { type: "json_object" },
        }),
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: resourcesPrompt }],
          response_format: { type: "json_object" },
        })
      ]);
  
      const explanation = explanationResponse.choices[0].message.content;
      
      // Parse the JSON response for questions
      let practiceQuestions = [];
      try {
        const content = questionsResponse.choices[0].message.content;
        const parsedContent = JSON.parse(content);
        practiceQuestions = parsedContent.questions || [];
        
        // Ensure correct format if structure is different
        if (!Array.isArray(practiceQuestions)) {
          throw new Error("Questions not in expected format");
        }
      } catch (parseError) {
        console.error("Error parsing questions:", parseError);
        practiceQuestions = [];
      }
  
      // Parse the JSON response for resources
      let resources = [];
      try {
        const resourceContent = resourcesResponse.choices[0].message.content;
        const parsedResources = JSON.parse(resourceContent);
        resources = parsedResources.resources || [];
        
        if (!Array.isArray(resources)) {
          throw new Error("Resources not in expected format");
        }
      } catch (parseError) {
        console.error("Error parsing resources:", parseError);
        resources = [];
      }
  
      res.json({ 
        explanation, 
        questions: practiceQuestions,
        resources 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch response from OpenAI.' });
    }
}

module.exports = {
    getResult
}