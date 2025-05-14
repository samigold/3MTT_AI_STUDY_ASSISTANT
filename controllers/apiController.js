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
      const simplePrompt = `Explain the following topic in ${course} as if you're talking to a 5-year-old: "${question}". 
Use real-world analogies, avoid jargon, and make it fun and engaging for a young learner. 
Break it down step by step, and use simple examples.`;

      const technicalPrompt = `Explain "${question}" in the context of ${course} in a highly technical way. 
Include detailed concepts, relevant terminology, real-world applications, best practices, and code snippets if applicable.`;
      
      if (explanationLevel === "simple") {
        explanationPrompt = simplePrompt;
      } else {
        explanationPrompt = technicalPrompt;
      }
  
      const questionsPrompt = `Generate 5 multiple-choice questions related to ${question} in the context of ${course}. For each question, provide 4 options (A, B, C, D) and indicate the correct answer. Format the response as a JSON array with each object containing: question, options (array of 4 strings), and correctAnswer (index number 0-3).`;
  
      // Add prompt for generating resource links
      const resourcesPrompt = `Provide 3-5 high-quality external learning resources (articles, tutorials, documentation, videos) about "${question}" in the context of ${course}. Format the response as a JSON array with each object containing: title, url, and type (article, video, tutorial, documentation, or tool). Only include real, specific URLs that actually exist.`;      // Make parallel API calls for all requests
      const [
        simpleExplanationResponse,
        technicalExplanationResponse,
        questionsResponse,
        resourcesResponse
      ] = await Promise.all([        openai.chat.completions.create({
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
        }),
      ]);      // Get both explanations
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
      }      res.json({ 
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

const handleAskRequest = async (req, res) => {
  try {
    const { course, question, explanationLevel, quizMode } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }
    
    console.log(`[${new Date().toISOString()}] New request: ${course} - ${question} (${explanationLevel}${quizMode === 'true' ? ', Quiz Mode' : ''})`);
    
    // Here we would typically call an external AI API like OpenAI
    // For this demo, we'll simulate a response
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (quizMode === 'true') {
      // Generate quiz questions instead of an explanation
      const response = generateQuizResponse(course, question);
      return res.json(response);
    } else {
      // Generate a regular explanation
      const response = generateExplanationResponse(course, question, explanationLevel);
      return res.json(response);
    }
    
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
};

// Generate a quiz response with multiple-choice questions
function generateQuizResponse(course, question) {
  // In a real implementation, this would call an AI service to generate questions
  
  // Sample questions based on the topic
  let questions = [];
  
  if (course.toLowerCase().includes('javascript') || question.toLowerCase().includes('javascript')) {
    questions = [
      {
        question: "What is the correct way to declare a variable in JavaScript that can be reassigned?",
        options: ["const x = 5;", "let x = 5;", "var x = 5;", "Both B and C"],
        correctAnswer: 1 // Index of the correct answer (0-based)
      },
      {
        question: "Which of the following is NOT a JavaScript data type?",
        options: ["Boolean", "Float", "Object", "String"],
        correctAnswer: 1
      },
      {
        question: "Which method adds an element to the end of an array?",
        options: ["push()", "pop()", "shift()", "unshift()"],
        correctAnswer: 0
      },
      {
        question: "What is the result of '5' + 3 in JavaScript?",
        options: ["8", "53", "Error", "undefined"],
        correctAnswer: 1
      },
      {
        question: "Which of these is a JavaScript framework?",
        options: ["Laravel", "Django", "React", "Ruby on Rails"],
        correctAnswer: 2
      }
    ];
  } else if (course.toLowerCase().includes('python') || question.toLowerCase().includes('python')) {
    questions = [
      {
        question: "What is the correct way to create a function in Python?",
        options: ["function myFunc():", "def myFunc():", "create myFunc():", "func myFunc():"],
        correctAnswer: 1
      },
      {
        question: "Which of the following is used to add a comment in Python?",
        options: ["// Comment", "/* Comment */", "# Comment", "<!-- Comment -->"],
        correctAnswer: 2
      },
      {
        question: "Which method is used to add an element to a list in Python?",
        options: ["add()", "append()", "insert()", "push()"],
        correctAnswer: 1
      },
      {
        question: "What does the 'self' keyword represent in a Python class?",
        options: ["The class itself", "The instance of the class", "The parent class", "The module"],
        correctAnswer: 1
      },
      {
        question: "Which of the following is NOT a built-in data type in Python?",
        options: ["List", "Dictionary", "Array", "Tuple"],
        correctAnswer: 2
      }
    ];
  } else {
    // Generic technology questions
    questions = [
      {
        question: "What does HTML stand for?",
        options: [
          "Hyper Text Markup Language", 
          "High Tech Modern Language", 
          "Hyper Transfer Markup Language", 
          "Home Tool Markup Language"
        ],
        correctAnswer: 0
      },
      {
        question: "Which of the following is a version control system?",
        options: ["Docker", "Kubernetes", "Git", "Jenkins"],
        correctAnswer: 2
      },
      {
        question: "What is the primary purpose of CSS?",
        options: [
          "To add interactivity to web pages", 
          "To style and layout web pages", 
          "To structure web content", 
          "To communicate with a server"
        ],
        correctAnswer: 1
      },
      {
        question: "What does API stand for?",
        options: [
          "Application Programming Interface", 
          "Automated Programming Integration", 
          "Application Process Integration", 
          "Advanced Programming Interface"
        ],
        correctAnswer: 0
      },
      {
        question: "Which database type stores data in tables with rows and columns?",
        options: ["NoSQL", "Graph Database", "Relational Database", "Document Database"],
        correctAnswer: 2
      }
    ];
  }
  
  // Filter questions based on the topic if needed
  const filteredQuestions = questions;
  
  return {
    questions: filteredQuestions,
    resources: generateResources(course, question)
  };
}

// Generate a regular explanation response
function generateExplanationResponse(course, question, explanationLevel) {
  // In a real implementation, this would call an AI service to generate explanation
  
  let explanation = "";
  let questions = [];
    if (explanationLevel === 'simple') {
    explanation = `Here's a simple explanation of ${question} in ${course}:\n\n`;
  } else if (explanationLevel === 'advanced') {
    explanation = `Here's an advanced technical explanation of ${question} in ${course}:\n\n`;
  } else {
    explanation = `Here's an explanation of ${question} in ${course}:\n\n`;
  }
    // Sample content based on the course/question
  if (question.toLowerCase().includes('factory function')) {
    if (explanationLevel === 'simple') {
      explanation += "Factory functions are special functions that create and return new objects. Think of them like a toy factory - you put in your order (parameters) and get back a new toy (object) built to your specifications. They're a way to make multiple similar objects without writing the same code over and over again. Unlike constructor functions, they don't need the 'new' keyword, making them simpler to use and understand!";
    } else {
      explanation += "Factory functions in JavaScript are functions that return new object instances without requiring the 'new' keyword that constructors need. They encapsulate the object creation process, providing several advantages:\n\n" +
        "1. **Privacy/Closure**: Factory functions create closures that allow for private data and methods, unlike constructors or classes where all properties are public.\n\n" +
        "2. **No 'this' binding issues**: Since they don't rely on 'this', factory functions avoid common binding problems found in constructors when methods are used as callbacks.\n\n" +
        "3. **Composition over inheritance**: They promote object composition patterns, allowing for more flexible code than classical inheritance hierarchies.\n\n" +
        "4. **Dynamic object creation**: Factory functions can conditionally create different object types or add properties/methods based on parameters.\n\n" +
        "Example of a factory function:\n\n" +
        "```javascript\nfunction createPerson(name, age) {\n  // Private variables\n  const birthYear = new Date().getFullYear() - age;\n  \n  // Public interface\n  return {\n    name,\n    age,\n    greet() {\n      return `Hi, I'm ${name} and I'm ${age} years old`;\n    },\n    getBirthYear() {\n      return birthYear; // Accessing private data\n    }\n  };\n}\n\nconst person1 = createPerson('Alice', 25);\nconst person2 = createPerson('Bob', 30);\n```\n\n" +
        "Factory functions are a fundamental part of functional programming in JavaScript, representing an alternative to classes and constructor functions for creating objects with behavior.";
    }
    
    questions = [
      {
        question: "What is the main advantage of factory functions over constructor functions?",
        options: [
          "Factory functions are faster", 
          "Factory functions don't require the 'new' keyword", 
          "Factory functions automatically create getters and setters", 
          "Factory functions can only be used in ES6 and above"
        ],
        correctAnswer: 1
      },
      {
        question: "How do factory functions enable data privacy in JavaScript?",
        options: [
          "By using the 'private' keyword on variables", 
          "By leveraging closures to encapsulate variables", 
          "By automatically encrypting the returned object", 
          "By using special 'hidden' properties"
        ],
        correctAnswer: 1
      },
      {
        question: "What pattern do factory functions naturally encourage?",
        options: [
          "Inheritance", 
          "Composition", 
          "Mutation", 
          "Synchronization"
        ],
        correctAnswer: 1
      },
      {
        question: "Which of the following is NOT a characteristic of factory functions?",
        options: [
          "They return objects", 
          "They can create private variables", 
          "They require the 'new' keyword", 
          "They can customize objects based on parameters"
        ],
        correctAnswer: 2
      }
    ];
  }
  else if (course.toLowerCase().includes('javascript') || question.toLowerCase().includes('javascript')) {
    explanation += "JavaScript is a high-level, interpreted programming language that conforms to the ECMAScript specification. JavaScript is multi-paradigm, supporting event-driven, functional, and imperative programming styles. It has APIs for working with text, arrays, dates, regular expressions, and the DOM.";
    
    questions = [
      {
        question: "What is the difference between let and const in JavaScript?",
        options: [
          "let is block-scoped, const is function-scoped", 
          "let can be reassigned, const cannot", 
          "let is for strings, const is for numbers", 
          "let is deprecated, const is the new standard"
        ],
        correctAnswer: 1
      },
      {
        question: "What is a closure in JavaScript?",
        options: [
          "A way to secure variables from unauthorized access", 
          "A function that has access to variables from its outer scope", 
          "A method to close browser windows", 
          "A data structure for storing key-value pairs"
        ],
        correctAnswer: 1
      }
    ];
  } else if (course.toLowerCase().includes('python') || question.toLowerCase().includes('python')) {
    explanation += "Python is an interpreted, high-level, general-purpose programming language. Its design philosophy emphasizes code readability with the use of significant whitespace. Python features a dynamic type system and automatic memory management and supports multiple programming paradigms.";
    
    questions = [
      {
        question: "What are Python decorators used for?",
        options: [
          "To add graphical elements to Python GUIs", 
          "To modify the behavior of functions or classes", 
          "To format code for better readability", 
          "To optimize code execution speed"
        ],
        correctAnswer: 1
      },
      {
        question: "What is the difference between a list and a tuple in Python?",
        options: [
          "Lists can contain any data type, tuples cannot", 
          "Lists are ordered, tuples are unordered", 
          "Lists are mutable, tuples are immutable", 
          "Lists are for numbers, tuples are for strings"
        ],
        correctAnswer: 2
      }
    ];  } else if (course.toLowerCase().includes('frontend') || question.toLowerCase().includes('frontend') || 
            question.toLowerCase().includes('html') || question.toLowerCase().includes('css')) {
    explanation += `Frontend development focuses on creating the visual and interactive elements of websites and applications that users directly interact with. It involves HTML (for structure), CSS (for styling), and JavaScript (for interactivity). Modern frontend development also includes frameworks like React, Vue, or Angular that help developers build complex user interfaces efficiently. Responsive design principles ensure websites look good on all devices, while performance optimization techniques help pages load quickly.`;
    
    questions = [
      {
        question: "Which technology is primarily responsible for the structure of web pages?",
        options: ["CSS", "HTML", "JavaScript", "WebAssembly"],
        correctAnswer: 1
      },
      {
        question: "What is the purpose of CSS in web development?",
        options: [
          "To add interactivity to web pages", 
          "To define the structure of web pages", 
          "To style and layout web pages", 
          "To communicate with backend servers"
        ],
        correctAnswer: 2
      },
      {
        question: "Which of these is NOT a JavaScript framework?",
        options: ["React", "Angular", "Vue", "Sass"],
        correctAnswer: 3
      },
      {
        question: "What does 'responsive design' mean?",
        options: [
          "Websites that respond quickly to user input", 
          "Websites that adapt to different screen sizes and devices", 
          "Websites that can handle high traffic volumes", 
          "Websites that respond to voice commands"
        ],
        correctAnswer: 1
      }
    ];  } else if (course.toLowerCase().includes('backend') || question.toLowerCase().includes('backend') || 
            question.toLowerCase().includes('server') || question.toLowerCase().includes('api')) {
    explanation += `Backend development focuses on server-side logic, database interactions, and APIs that power web applications. Backend developers work with languages like Node.js, Python, Java, or PHP to build the "behind the scenes" functionality that frontend interfaces connect to. This includes managing databases, authentication systems, server configuration, and creating RESTful or GraphQL APIs. The backend is responsible for processing user inputs, storing data securely, and sending appropriate responses back to the client.`;
    
    questions = [
      {
        question: "Which of these is NOT typically a backend programming language?",
        options: ["Python", "Node.js", "CSS", "PHP"],
        correctAnswer: 2
      },
      {
        question: "What is the primary purpose of an API in web development?",
        options: [
          "To style web pages", 
          "To allow communication between frontend and backend systems", 
          "To create animations", 
          "To compress images"
        ],
        correctAnswer: 1
      },
      {
        question: "Which database type is classified as NoSQL?",
        options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"],
        correctAnswer: 2
      },
      {
        question: "What does REST stand for in the context of APIs?",
        options: [
          "Representational State Transfer", 
          "Remote Execution State Technology", 
          "Regular Expression Syntax Transfer", 
          "Resource Exchange System Tool"
        ],
        correctAnswer: 0
      }
    ];
  } else if (course.toLowerCase().includes('ui/ux') || question.toLowerCase().includes('ui') || 
            question.toLowerCase().includes('ux') || question.toLowerCase().includes('design')) {
    explanation += `UI/UX Design focuses on creating meaningful and relevant experiences for users. UI (User Interface) involves the visual elements users interact with—like buttons, icons, and layout—while UX (User Experience) encompasses the entire journey and how users feel when using a product. Good UI/UX design requires understanding user needs through research, creating user personas, wireframing interfaces, designing visual elements, prototyping, and usability testing. The goal is to create products that are not only aesthetically pleasing but also intuitive, accessible, and efficient.`;
    
    questions = [
      {
        question: "What is the difference between UI and UX?",
        options: [
          "UI is about visual design, UX is about the entire user journey", 
          "UI is for mobile apps, UX is for websites", 
          "UI is about coding, UX is about design", 
          "UI is backend, UX is frontend"
        ],
        correctAnswer: 0
      },
      {
        question: "Which of these is NOT typically part of the UX design process?",
        options: [
          "User Research", 
          "Wireframing", 
          "Server Configuration", 
          "Usability Testing"
        ],
        correctAnswer: 2
      },
      {
        question: "What is a user persona?",
        options: [
          "A fictional character in product marketing", 
          "A representative model of a target user group", 
          "A customer support representative", 
          "A person who tests the product before release"
        ],
        correctAnswer: 1
      },
      {
        question: "Which principle refers to making a design easy to understand and use?",
        options: [
          "Scalability", 
          "Intuitiveness", 
          "Redundancy", 
          "Complexity"
        ],
        correctAnswer: 1
      }
    ];
  } else if (course.toLowerCase().includes('data science') || question.toLowerCase().includes('data') || 
            question.toLowerCase().includes('analytics') || question.toLowerCase().includes('machine learning')) {
    explanation += `Data Science combines domain expertise, programming skills, and knowledge of mathematics and statistics to extract meaningful insights from data. The field encompasses data cleaning and processing, exploratory data analysis, feature engineering, and building machine learning models. Data scientists use programming languages like Python or R along with specialized libraries for data manipulation, visualization, and modeling. The insights derived from data science help businesses make data-driven decisions, optimize processes, understand customer behavior, and develop AI-powered products and services.`;
    
    questions = [
      {
        question: "Which of these is NOT a common step in the data science process?",
        options: [
          "Data Cleaning", 
          "Exploratory Data Analysis", 
          "User Interface Design", 
          "Model Deployment"
        ],
        correctAnswer: 2
      },
      {
        question: "Which programming language is most commonly used in data science?",
        options: [
          "JavaScript", 
          "Python", 
          "C++", 
          "PHP"
        ],
        correctAnswer: 1
      },
      {
        question: "What does 'feature engineering' refer to in machine learning?",
        options: [
          "Designing the user interface", 
          "Creating new variables from existing data to improve model performance", 
          "Engineering the physical components of computers", 
          "Fixing bugs in machine learning algorithms"
        ],
        correctAnswer: 1
      },
      {
        question: "Which type of machine learning involves training a model without labeled data?",
        options: [
          "Supervised learning", 
          "Unsupervised learning", 
          "Reinforcement learning", 
          "Transfer learning"
        ],
        correctAnswer: 1
      }
    ];
  } else {
    // Better generic tech content based on the question
    explanation += `${question} is an important topic in ${course}. Understanding this concept helps developers create more efficient, maintainable, and scalable applications. While specific implementation details may vary depending on programming languages and frameworks used, the fundamental principles remain consistent across different technology stacks. As technology continues to evolve, staying updated on best practices related to ${question} will help ensure your applications remain modern and competitive.`;
    
    // Generate more relevant generic questions based on the question asked
    questions = [
      {
        question: `Why is ${question} important in ${course}?`,
        options: [
          "It improves application performance", 
          "It enhances user experience", 
          "It follows industry best practices", 
          "All of the above"
        ],
        correctAnswer: 3
      },
      {
        question: `Which of these is NOT typically associated with ${question}?`,
        options: [
          "Improved code maintainability", 
          "Increased development complexity", 
          "Better collaboration between team members", 
          "Enhanced security"
        ],
        correctAnswer: 1
      },
      {
        question: `When implementing ${question} in a project, what should be considered first?`,
        options: [
          "Technical requirements and constraints", 
          "Available development budget", 
          "User needs and business goals", 
          "Team's technical expertise"
        ],
        correctAnswer: 2
      },
      {
        question: "Which approach is generally considered best practice in modern development?",
        options: [
          "Quick implementation over proper planning", 
          "Following established patterns and standards", 
          "Using the newest technologies regardless of stability", 
          "Prioritizing complex solutions for future-proofing"
        ],
        correctAnswer: 1
      }
    ];
  }
  
  return {
    explanation,
    questions,
    resources: generateResources(course, question)
  };
}

// Generate relevant resources based on the query
function generateResources(course, question) {
  // In a real implementation, this might fetch from a database or external API
  
  // Sample resources based on the topic
  const resources = [];
  
  if (course.toLowerCase().includes('javascript') || question.toLowerCase().includes('javascript')) {
    resources.push(
      {
        title: "MDN JavaScript Guide",
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        type: "documentation"
      },
      {
        title: "JavaScript.info",
        url: "https://javascript.info/",
        type: "tutorial"
      },
      {
        title: "Learn JavaScript - Full Course for Beginners",
        url: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
        type: "video"
      }
    );
  } else if (course.toLowerCase().includes('python') || question.toLowerCase().includes('python')) {
    resources.push(
      {
        title: "Python Official Documentation",
        url: "https://docs.python.org/3/",
        type: "documentation"
      },
      {
        title: "Real Python Tutorials",
        url: "https://realpython.com/",
        type: "tutorial"
      },
      {
        title: "Python Crash Course - Full Course for Beginners",
        url: "https://www.youtube.com/watch?v=JJmcL1N2KQs",
        type: "video"
      }
    );
  } else {
    // Generic tech resources
    resources.push(
      {
        title: "MDN Web Docs",
        url: "https://developer.mozilla.org/",
        type: "documentation"
      },
      {
        title: "freeCodeCamp",
        url: "https://www.freecodecamp.org/",
        type: "tutorial"
      },
      {
        title: "Tech Stack Explained",
        url: "https://www.youtube.com/c/freeCodeCamp",
        type: "video"
      }
    );
  }
  
  return resources;
}

module.exports = {
    getResult,
    handleAskRequest
}