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
  
    try {      let explanationPrompt = "";
      if (explanationLevel === "simple") {
        explanationPrompt = `Explain the following topic related to ${course} as if you're explaining to a 5-year-old: "${question}". 
Keep it very simple and use analogies a child would understand.

FORMAT YOUR RESPONSE WITH PROPER MARKDOWN:
- Use # for main headings
- Use ## for subheadings
- Use ### for section titles
- Use **bold** for important terms
- Use _italic_ for emphasis
- Use \`code\` for inline code
- Use \`\`\` for code blocks
- Use numbered lists for steps
- Use bullet points for lists
- Structure your response with clear sections`;
      } else {
        explanationPrompt = `Provide an in-depth explanation for the following topic related to ${course}: "${question}". 
Include detailed information, technical concepts, and examples where appropriate.

FORMAT YOUR RESPONSE WITH PROPER MARKDOWN:
- Use # for main headings
- Use ## for subheadings
- Use ### for section titles
- Use **bold** for important terms
- Use _italic_ for emphasis
- Use \`code\` for inline code
- Use \`\`\` for code blocks with proper syntax highlighting
- Use numbered lists for steps
- Use bullet points for lists
- Structure your response with clear sections including:
  1. Overview/Introduction
  2. Core Concepts
  3. Practical Examples with code
  4. Best Practices
  5. Common Pitfalls`;
      }
  
      const questionsPrompt = `Generate 5 multiple-choice questions related to ${question} in the context of ${course}. For each question, provide 4 options (A, B, C, D) and indicate the correct answer. Format the response as a JSON array with each object containing: question, options (array of 4 strings), and correctAnswer (index number 0-3).`;
  
      // Add prompt for generating resource links
      const resourcesPrompt = `Provide 3-5 high-quality external learning resources (articles, tutorials, documentation, videos) about "${question}" in the context of ${course}. Format the response as a JSON array with each object containing: title, url, and type (article, video, tutorial, documentation, or tool). Only include real, specific URLs that actually exist.`;      // Create both simple and technical prompts
      const simplePrompt = `Explain the following topic related to ${course} as if you're explaining to a 5-year-old: "${question}". 
Keep it very simple and use analogies a child would understand.

FORMAT YOUR RESPONSE WITH PROPER MARKDOWN:
- Use # for main headings
- Use ## for subheadings
- Use ### for section titles
- Use **bold** for important terms
- Use _italic_ for emphasis
- Use \`code\` for inline code
- Use \`\`\` for code blocks
- Use numbered lists for steps
- Use bullet points for lists
- Structure your response with clear sections`;

      const technicalPrompt = `Provide an in-depth explanation for the following topic related to ${course}: "${question}". 
Include detailed information, technical concepts, and examples where appropriate.

FORMAT YOUR RESPONSE WITH PROPER MARKDOWN:
- Use # for main headings
- Use ## for subheadings
- Use ### for section titles
- Use **bold** for important terms
- Use _italic_ for emphasis
- Use \`code\` for inline code
- Use \`\`\` for code blocks with proper syntax highlighting
- Use numbered lists for steps
- Use bullet points for lists
- Structure your response with clear sections including:
  1. Overview/Introduction
  2. Core Concepts
  3. Practical Examples with code
  4. Best Practices
  5. Common Pitfalls`;

      // Make parallel API calls for all requests
      const [
        simpleExplanationResponse,
        technicalExplanationResponse,
        questionsResponse,
        resourcesResponse
      ] = await Promise.all([
        openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: simplePrompt }],
        }),
        openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: technicalPrompt }],
        }),
        openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: questionsPrompt }],
          response_format: { type: "json_object" },
        }),
        openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: resourcesPrompt }],
          response_format: { type: "json_object" },
        })
      ]);
      
      // Get the appropriate explanation based on user preference
      let explanation;
      if (explanationLevel === "simple") {
        explanation = simpleExplanationResponse.choices[0].message.content;
      } else {
        explanation = technicalExplanationResponse.choices[0].message.content;
      }
      
      // Store both explanations
      const simpleExplanation = simpleExplanationResponse.choices[0].message.content;
      const technicalExplanation = technicalExplanationResponse.choices[0].message.content;
      
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
      }      // Return both explanations along with the currently selected one
      res.json({ 
        explanation,
        simpleExplanation, 
        technicalExplanation,
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