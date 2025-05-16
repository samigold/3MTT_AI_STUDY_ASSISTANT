require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

// Define course topics and relevant keywords for validation
const courseTopics = {
  "Frontend": [
    "HTML", "CSS", "JavaScript", "React", "Vue", "Angular", "DOM", "responsive design", 
    "web design", "UI", "Bootstrap", "Tailwind", "SASS", "LESS", "webpack", "Babel",
    "jQuery", "TypeScript", "frontend", "web development", "flexbox", "grid", "animations"
  ],
  "Backend": [
    "Node.js", "Express", "Django", "Flask", "Ruby on Rails", "PHP", "Laravel", "API", 
    "REST", "GraphQL", "database", "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL",
    "authentication", "authorization", "backend", "server", "middleware", "microservices"
  ],
  "Product": [
    "product management", "user story", "roadmap", "MVP", "agile", "scrum", "kanban", 
    "user research", "market research", "A/B testing", "product strategy", "user feedback",
    "customer development", "product lifecycle", "feature prioritization", "stakeholder"
  ],
  "UI/UX": [
    "user experience", "user interface", "wireframe", "mockup", "prototype", "usability",
    "accessibility", "UI/UX", "design thinking", "user testing", "Figma", "Sketch", "Adobe XD",
    "user research", "information architecture", "interaction design", "visual design"
  ],
  "Data Science": [
    "Python", "R", "statistics", "machine learning", "AI", "data visualization", "pandas",
    "NumPy", "data mining", "big data", "data analysis", "Jupyter", "TensorFlow", "PyTorch",
    "regression", "classification", "clustering", "neural networks", "deep learning"
  ],
  "Cybersecurity": [
    "security", "encryption", "network security", "penetration testing", "vulnerability",
    "firewall", "malware", "phishing", "authentication", "authorization", "cryptography",
    "ethical hacking", "OWASP", "security audit", "threat modeling", "intrusion detection"
  ],
  "Cloud Computing": [
    "AWS", "Azure", "Google Cloud", "cloud services", "serverless", "IaaS", "PaaS", "SaaS",
    "containers", "Docker", "Kubernetes", "virtualization", "cloud architecture", "Lambda",
    "scalability", "load balancing", "cloud security", "cloud migration", "cloud storage"
  ],
  "DevOps": [
    "CI/CD", "continuous integration", "continuous deployment", "Jenkins", "GitHub Actions",
    "infrastructure as code", "Terraform", "Ansible", "monitoring", "logging", "Docker",
    "Kubernetes", "automation", "DevOps", "GitOps", "SRE", "site reliability"
  ]
};

// Function to check if a question is relevant to the selected course
function isQuestionRelevantToCourse(question, course) {
  // If the course doesn't exist in our topics, we can't validate
  if (!courseTopics[course]) {
    return true; // Allow by default if we can't validate
  }
  
  // Convert question to lowercase for case-insensitive matching
  const lowerQuestion = question.toLowerCase();
  const keywords = courseTopics[course].map(keyword => keyword.toLowerCase());
  
  // Check if any keyword from the course is in the question
  for (const keyword of keywords) {
    if (lowerQuestion.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  // If no direct match, use a more sophisticated approach with word stemming
  // This is a basic implementation - could be improved with NLP libraries
  const questionWords = lowerQuestion.split(/\W+/).filter(word => word.length > 3);
  for (const keyword of keywords) {
    const keywordStem = keyword.toLowerCase().substring(0, 4); // Simple stemming
    for (const word of questionWords) {
      if (word.startsWith(keywordStem)) {
        return true;
      }
    }
  }
  
  // No match found
  return false;
}

const getResult = async (req, res) => {
    const { course, question, explanationLevel } = req.body;

    if (!course || !question) {
      return res.status(400).json({ error: 'Course and question are required.' });
    }
    
    // Validate if the question is relevant to the selected course
    if (!isQuestionRelevantToCourse(question, course)) {
      return res.status(400).json({ 
        error: 'Your question does not appear to be related to the selected course. Please ask a question relevant to the course materials or select a different course.',
        isRelevanceError: true
      });
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