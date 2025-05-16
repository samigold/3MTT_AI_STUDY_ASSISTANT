document.addEventListener('DOMContentLoaded', () => {
  // Initialize syntax highlighting if highlight.js is available
  if (typeof hljs !== 'undefined') {
    hljs.configure({
      ignoreUnescapedHTML: true,
      languages: ['javascript', 'html', 'css', 'python', 'java', 'json', 'bash', 'typescript']
    });
  }
  
  // Form elements
  const form = document.getElementById('ask-form');
  const courseSelect = document.getElementById('course');
  const questionInput = document.getElementById('question');
  const explanationLevelInput = document.getElementById('explanationLevel');
  const showAiLogsCheckbox = document.getElementById('show-ai-logs');
    // UI components
  const loading = document.getElementById('loading');
  const responseDiv = document.getElementById('response');
  const explanation = document.getElementById('explanation');
  const quizContainer = document.getElementById('quiz-container');
  const quizControls = document.getElementById('quiz-controls');
  const quizResults = document.getElementById('quiz-results');
  const scoreDisplay = document.getElementById('score-display');
  const quizFeedback = document.getElementById('quiz-feedback');
  const submitQuizBtn = document.getElementById('submit-quiz');
  const resetQuizBtn = document.getElementById('reset-quiz');
  const resourcesContainer = document.getElementById('resources-container');
  const errorDiv = document.getElementById('error');
  const errorText = document.getElementById('error-text');
  
  // New UI elements
  const explanationLevelOptions = document.querySelectorAll('.explanation-level-option');
  const aiLogContainer = document.getElementById('ai-log-container');
  const aiLogContent = document.getElementById('ai-log-content');
  const toggleLogSizeBtn = document.getElementById('toggle-log-size');
  const toggleExplanationBtn = document.getElementById('toggle-explanation-btn');
  const copyExplanationBtn = document.getElementById('copy-explanation');
  const exportBtn = document.getElementById('export-btn');
  const exportDropdown = document.getElementById('export-dropdown');
  const exportPdfBtn = document.getElementById('export-pdf');
  const exportTextBtn = document.getElementById('export-text');
  
  // Voice and speech elements
  const voiceInputBtn = document.getElementById('voice-input-btn');
  const voiceStatus = document.getElementById('voice-status');
  const textToSpeechBtn = document.getElementById('text-to-speech-btn');
  
  // Speech recognition setup
  let recognition = null;
  try {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
    }
  } catch (e) {
    console.warn('Speech recognition not supported:', e);
  }
  
  // Speech synthesis setup
  const synth = window.speechSynthesis;
  let isSpeaking = false;
  let currentUtterance = null;
  
  // Store data
  let questionsData = [];
  let currentRequestData = {};
  let currentResponseData = {};
    // Store both explanations for toggling
  let currentSimpleExplanation = '';
  let currentTechnicalExplanation = '';
  let currentExplanationType = 'simple';
  
  // Function to toggle between simple and technical explanations
  function toggleExplanationType() {
    if (!currentSimpleExplanation || !currentTechnicalExplanation) {
      showNotification('Both explanation types are not available', true);
      return; // Do nothing if we don't have both explanations
    }
    
    // Check if button exists (using the existing variable from outer scope)
    if (!toggleExplanationBtn) return;
    
    // Check if explanation element exists
    if (!explanation) {
      console.error('Explanation element not found');
      showNotification('Cannot toggle explanation - element not found', true);
      return;
    }
    
    if (currentExplanationType === 'simple') {
      currentExplanationType = 'technical';
      const formattedExplanation = formatExplanation(currentTechnicalExplanation);
      explanation.innerHTML = formattedExplanation;
      toggleExplanationBtn.textContent = 'Switch to Simple Explanation';
      toggleExplanationBtn.classList.remove('btn-primary');
      toggleExplanationBtn.classList.add('btn-secondary');
    } else {
      currentExplanationType = 'simple';
      const formattedExplanation = formatExplanation(currentSimpleExplanation);
      explanation.innerHTML = formattedExplanation;
      toggleExplanationBtn.textContent = 'Switch to Technical Explanation';
      toggleExplanationBtn.classList.remove('btn-secondary');
      toggleExplanationBtn.classList.add('btn-primary');
    }
    // Apply syntax highlighting if highlight.js is available
    if (typeof hljs !== 'undefined' && explanation) {
      explanation.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }
  
  // Voice input handler
  if (voiceInputBtn && recognition) {
    voiceInputBtn.addEventListener('click', toggleVoiceInput);
  } else if (voiceInputBtn) {
    voiceInputBtn.addEventListener('click', () => {
      showNotification('Speech recognition is not supported in your browser', true);
      voiceInputBtn.style.opacity = '0.5';
      voiceInputBtn.style.cursor = 'not-allowed';
    });
  }
  
  function toggleVoiceInput() {
    if (recognition.onstart) {
      // Stop recognition if it's already active
      recognition.stop();
      return;
    }
    
    // Clear previous handlers
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    
    // Update UI to show we're listening
    voiceStatus.classList.remove('hidden');
    voiceInputBtn.innerHTML = '<i class="bx bx-stop-circle text-red-500 text-xl"></i>';
    voiceInputBtn.title = 'Stop listening';
    
    // Set up event handlers
    recognition.onstart = () => {
      console.log('Voice recognition started');
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
        
      questionInput.value = transcript;
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      resetVoiceInput();
      showNotification(`Error: ${event.error}`, true);
    };
    
    recognition.onend = () => {
      resetVoiceInput();
    };
    
    // Start recognition
    recognition.start();
  }
  
  function resetVoiceInput() {
    voiceStatus.classList.add('hidden');
    voiceInputBtn.innerHTML = '<i class="bx bx-microphone text-xl"></i>';
    voiceInputBtn.title = 'Talk instead';
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }
  
  // Text-to-speech handler
  if (textToSpeechBtn) {
    textToSpeechBtn.addEventListener('click', toggleTextToSpeech);
  }
  
  function toggleTextToSpeech() {
    if (isSpeaking) {
      // Stop speaking if already active
      synth.cancel();
      isSpeaking = false;
      textToSpeechBtn.innerHTML = '<i class="bx bx-volume-full"></i>';
      textToSpeechBtn.title = 'Listen to explanation';
      return;
    }
    
    // Get text to speak
    const text = explanation.textContent;
    if (!text || text.trim() === '') {
      showNotification('Nothing to read', true);
      return;
    }
    
    // Create utterance and set properties
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use a female English voice if available
    const voices = synth.getVoices();
    const englishVoices = voices.filter(voice => voice.lang.includes('en-'));
    if (englishVoices.length > 0) {
      // Prefer female voices when available
      const femaleVoice = englishVoices.find(voice => voice.name.includes('Female'));
      utterance.voice = femaleVoice || englishVoices[0];
    }
    
    // Set event handlers
    utterance.onstart = () => {
      isSpeaking = true;
      textToSpeechBtn.innerHTML = '<i class="bx bx-stop-circle text-red-500"></i>';
      textToSpeechBtn.title = 'Stop speaking';
    };
    
    utterance.onend = () => {
      isSpeaking = false;
      textToSpeechBtn.innerHTML = '<i class="bx bx-volume-full"></i>';
      textToSpeechBtn.title = 'Listen to explanation';
      currentUtterance = null;
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error', event);
      isSpeaking = false;
      textToSpeechBtn.innerHTML = '<i class="bx bx-volume-full"></i>';
      textToSpeechBtn.title = 'Listen to explanation';
      currentUtterance = null;
    };
    
    // Start speaking
    currentUtterance = utterance;
    synth.speak(utterance);
  }
  
  // Handle explanation level selection
  explanationLevelOptions.forEach(option => {
    option.addEventListener('click', () => {
      explanationLevelOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      explanationLevelInput.value = option.dataset.level;
    });
  });
  
  // Toggle export dropdown
  exportBtn.addEventListener('click', () => {
    exportDropdown.classList.toggle('hidden');
  });
  
  // Close export dropdown when clicking elsewhere
  document.addEventListener('click', (event) => {
    if (!exportBtn.contains(event.target) && !exportDropdown.contains(event.target)) {
      exportDropdown.classList.add('hidden');
    }
  });
    // Copy explanation to clipboard
  copyExplanationBtn.addEventListener('click', async () => {
    try {
      // Get raw text without HTML tags for clipboard
      const textContent = explanation.innerText || explanation.textContent;
      await navigator.clipboard.writeText(textContent);
      showNotification('Copied to clipboard!');
    } catch (err) {
      showNotification('Failed to copy text', true);
    }
  });
  // Export as PDF
  exportPdfBtn.addEventListener('click', () => {
    exportDropdown.classList.add('hidden');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = `3MTT Study Assistant - ${courseSelect.value}: ${questionInput.value}`;
    // Use innerText to get text with line breaks preserved
    const content = explanation.innerText || explanation.textContent;
    
    // PDF generation with better formatting
    try {
      // Set document title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(title, 20, 20);
      
      // Process content by sections
      const lines = content.split('\n');
      let y = 35;  // Starting y position after title
      
      lines.forEach(line => {
        // Skip empty lines but add some spacing
        if (!line.trim()) {
          y += 3;
          return;
        }
        
        // Handle headings
        if (line.startsWith('# ')) {
          y += 5; // Add spacing before heading
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.text(line.substring(2), 20, y);
          y += 8;
          return;
        }
        
        if (line.startsWith('## ')) {
          y += 4; // Add spacing before subheading
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text(line.substring(3), 20, y);
          y += 6;
          return;
        }
        
        if (line.startsWith('### ')) {
          y += 3; // Add spacing before section title
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text(line.substring(4), 20, y);
          y += 5;
          return;
        }
        
        // Handle bullet points
        if (line.trim().startsWith('- ')) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          const bulletText = '• ' + line.substring(2);
          const splitBullet = doc.splitTextToSize(bulletText, 170);
          doc.text(splitBullet, 25, y); // Indent bullet points
          y += 5 * splitBullet.length;
          return;
        }
        
        // Handle numbered lists (1. 2. etc)
        if (/^\d+\.\s/.test(line.trim())) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          const splitNumbered = doc.splitTextToSize(line, 165);
          doc.text(splitNumbered, 25, y); // Indent numbered points
          y += 5 * splitNumbered.length;
          return;
        }
        
        // Handle code blocks (simplified - just change font)
        if (line.trim().startsWith('```') || line.trim() === '```') {
          y += 3;
          return;
        }
        
        // Regular text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(line, 170);
        doc.text(splitText, 20, y);
        y += 5 * splitText.length;
        
        // Add new page if we're near the bottom
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      
      doc.save(`3mtt-study-${courseSelect.value.toLowerCase()}-${Date.now()}.pdf`);
      showNotification('PDF downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      showNotification('Error generating PDF', true);
    }
  });
  
  // Export as Text
  exportTextBtn.addEventListener('click', () => {
    exportDropdown.classList.add('hidden');
    
    const title = `3MTT Study Assistant - ${courseSelect.value}: ${questionInput.value}\n\n`;
    const content = explanation.innerText;
    const fullText = title + content;
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3mtt-study-${courseSelect.value.toLowerCase()}-${Date.now()}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('Text file downloaded!');
  });
  
  // Toggle AI log size
  toggleLogSizeBtn.addEventListener('click', () => {
    const aiLog = aiLogContainer.querySelector('.ai-log');
    const isExpanded = aiLog.style.maxHeight === 'none';
    
    if (isExpanded) {
      aiLog.style.maxHeight = '250px';
      toggleLogSizeBtn.innerHTML = '<i class="bx bx-expand-alt"></i> Expand';
    } else {
      aiLog.style.maxHeight = 'none';
      toggleLogSizeBtn.innerHTML = '<i class="bx bx-collapse-alt"></i> Collapse';
    }
  });
  
  // Show/hide AI logs
  showAiLogsCheckbox.addEventListener('change', () => {
    if (currentRequestData.prompt) {
      aiLogContainer.classList.toggle('hidden', !showAiLogsCheckbox.checked);
    }
  });
  
  // Add event listener for the toggle explanation button
  if (toggleExplanationBtn) {
    toggleExplanationBtn.addEventListener('click', toggleExplanationType);
  }
  
  // Form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const course = courseSelect.value;
    const question = questionInput.value;
    const explanationLevel = explanationLevelInput.value;
    
    if (!question.trim()) {
      showError('Please enter a question or topic.');
      return;
    }
    
    // Reset UI state
    resetUI();
    
    // Show loading state
    loading.classList.remove('hidden');
    
    try {
      // Prepare request data for logging
      currentRequestData = {
        course,
        question,
        explanationLevel,
        timestamp: new Date().toISOString(),
        prompt: `${explanationLevel === 'simple' ? 'Explain like I\'m 5: ' : 'Technical explanation: '}"${question}" related to ${course}`
      };
        // Make API request
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, question, explanationLevel }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
          // Handle relevance error specifically
        if (errorData.isRelevanceError) {
          // Show a more helpful error message with course suggestion
          showError(`${errorData.error} 
          
          Your question about "${question}" doesn't seem to be related to ${course}. 
          
          Please try:
          1. Rewording your question to be more specific to ${course}
          2. Selecting a different course that matches your question topic
          3. Checking the list of available topics in the course dropdown`);
          
          // Highlight the course selector to indicate it may need to be changed
          courseSelect.classList.add('error-highlight');
          
          // Remove highlight after a delay
          setTimeout(() => {
            courseSelect.classList.remove('error-highlight');
          }, 3000);
        } else {
          throw new Error(errorData.error || 'Failed to fetch response');
        }
        return; // Exit early
      }
      
      const data = await response.json();
      
      // Store response data for logging
      currentResponseData = {
        timestamp: new Date().toISOString(),
        data: data
      };
      
      // Update AI logs
      updateAILogs();      // Store both explanations for toggle functionality
      currentSimpleExplanation = data.simpleExplanation || '';
      currentTechnicalExplanation = data.technicalExplanation || '';
      currentExplanationType = explanationLevel;
      
      // Format and display the selected explanation
      const formattedExplanation = formatExplanation(data.explanation || 'No explanation provided.');
      
      // Check if explanation element exists before setting its innerHTML
      if (explanation) {
        explanation.innerHTML = formattedExplanation;
      } else {
        console.error('Explanation element not found in DOM');
      }
      
      // Show toggle button if we have both explanations
      const toggleExplanationBtn = document.getElementById('toggle-explanation-btn');
      if (currentSimpleExplanation && currentTechnicalExplanation && toggleExplanationBtn) {
        toggleExplanationBtn.style.display = 'inline-flex';
        
        // Set the correct button text based on which explanation is currently shown
        if (currentExplanationType === 'simple') {
          toggleExplanationBtn.textContent = 'Switch to Technical Explanation';
          toggleExplanationBtn.classList.remove('btn-secondary');
          toggleExplanationBtn.classList.add('btn-primary');
        } else {
          toggleExplanationBtn.textContent = 'Switch to Simple Explanation';
          toggleExplanationBtn.classList.remove('btn-primary');
          toggleExplanationBtn.classList.add('btn-secondary');
        }      }
      
      // Apply syntax highlighting if highlight.js is available
      if (typeof hljs !== 'undefined' && explanation) {
        explanation.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      
      // Update questions
      questionsData = data.questions || [];
      renderQuiz(questionsData);
      
      // Render resources
      renderResources(data.resources || []);
      
      // Show response
      responseDiv.classList.remove('hidden');
      
      // Show quiz controls if we have questions
      if (questionsData.length > 0) {
        quizControls.classList.remove('hidden');
      }
      
      // Show AI logs if enabled
      if (showAiLogsCheckbox.checked) {
        aiLogContainer.classList.remove('hidden');
      }
      
    } catch (error) {
      console.error(error);
      showError(error.message || 'An error occurred. Please try again.');
    } finally {
      loading.classList.add('hidden');
    }
  });
  
  // Update AI logs in the UI
  function updateAILogs() {
    const requestLog = JSON.stringify(currentRequestData, null, 2);
    const responsePreview = JSON.stringify({
      explanation: currentResponseData.data.explanation.substring(0, 100) + '...',
      questionCount: currentResponseData.data.questions ? currentResponseData.data.questions.length : 0,
      resourceCount: currentResponseData.data.resources ? currentResponseData.data.resources.length : 0
    }, null, 2);
    
    const log = `// Request - ${currentRequestData.timestamp}
${requestLog}

// Response - ${currentResponseData.timestamp}
${responsePreview}`;
    
    aiLogContent.textContent = log;
  }
  
  // Reset UI state
  function resetUI() {
    responseDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    quizResults.classList.add('hidden');
    aiLogContainer.classList.add('hidden');
    exportDropdown.classList.add('hidden');
    
    // Stop any ongoing speech
    if (isSpeaking && synth) {
      synth.cancel();
      isSpeaking = false;
      if (textToSpeechBtn) {
        textToSpeechBtn.innerHTML = '<i class="bx bx-volume-full"></i>';
        textToSpeechBtn.title = 'Listen to explanation';
      }
    }
    
    // Stop any ongoing voice input
    if (recognition && recognition.onstart) {
      recognition.stop();
      resetVoiceInput();
    }
  }
    // Show error message
  function showError(message) {
    // Format message for HTML display
    const formattedMessage = message
      .split('\n')
      .filter(line => line.trim() !== '') // Remove empty lines
      .map(line => `<p class="mb-2">${line.trim()}</p>`)
      .join('');
    
    errorText.innerHTML = formattedMessage;
    errorDiv.classList.remove('hidden');
    
    // Scroll to error message
    errorDiv.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Show notification
  function showNotification(message, isError = false) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-3 rounded-lg shadow-lg flex items-center gap-2 transition-opacity duration-300 ${
      isError ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    
    // Add icon
    const icon = document.createElement('i');
    icon.className = `bx ${isError ? 'bx-error' : 'bx-check'}`;
    notification.appendChild(icon);
    
    // Add message
    const text = document.createElement('span');
    text.textContent = message;
    notification.appendChild(text);
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // Render the quiz questions
  function renderQuiz(questions) {
    quizContainer.innerHTML = '';
    
    if (!questions || questions.length === 0) {
      quizContainer.innerHTML = '<p class="text-center py-4">No practice questions available.</p>';
      return;
    }
    
    questions.forEach((q, questionIndex) => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'quiz-question';
      
      const questionHeader = document.createElement('div');
      questionHeader.className = 'flex items-center gap-2 mb-3';
      
      const questionNumber = document.createElement('span');
      questionNumber.className = 'flex items-center justify-center bg-primary-color text-white w-6 h-6 rounded-full text-sm font-bold';
      questionNumber.textContent = questionIndex + 1;
      
      const questionTitle = document.createElement('h3');
      questionTitle.className = 'font-semibold text-lg';
      questionTitle.textContent = q.question;
      
      questionHeader.appendChild(questionNumber);
      questionHeader.appendChild(questionTitle);
      questionDiv.appendChild(questionHeader);
      
      // Create option list
      const optionsList = document.createElement('div');
      optionsList.className = 'space-y-2 mt-3';
      
      q.options.forEach((option, optionIndex) => {
        const optionLabel = document.createElement('label');
        optionLabel.className = 'quiz-option flex items-start cursor-pointer rounded';
        
        const optionInput = document.createElement('input');
        optionInput.type = 'radio';
        optionInput.name = `question-${questionIndex}`;
        optionInput.value = optionIndex;
        optionInput.className = 'mt-1 mr-3';
        
        // Add event listener to highlight selected option
        optionInput.addEventListener('change', () => {
          // Remove highlight from all options in this question
          optionsList.querySelectorAll('.quiz-option').forEach(el => {
            el.classList.remove('quiz-option-selected');
          });
          
          // Add highlight to this option
          if (optionInput.checked) {
            optionLabel.classList.add('quiz-option-selected');
          }
        });
        
        const optionText = document.createElement('span');
        optionText.textContent = option;
        optionText.className = 'flex-1';
        
        optionLabel.appendChild(optionInput);
        optionLabel.appendChild(optionText);
        optionsList.appendChild(optionLabel);
      });
      
      questionDiv.appendChild(optionsList);
      quizContainer.appendChild(questionDiv);
    });
  }
  
  // Render the external resources
  function renderResources(resources) {
    resourcesContainer.innerHTML = '';
    
    if (!resources || resources.length === 0) {
      resourcesContainer.innerHTML = '<p class="text-center py-4">No additional resources available.</p>';
      return;
    }
    
    resources.forEach(resource => {
      // Create resource card
      const resourceCard = document.createElement('a');
      resourceCard.href = resource.url;
      resourceCard.target = '_blank';
      resourceCard.rel = 'noopener noreferrer';
      resourceCard.className = 'resource-card';
      
      // Create icon based on resource type
      const iconContainer = document.createElement('div');
      iconContainer.className = 'resource-icon';
      
      let iconClass = 'bx-file'; // Default icon
      if (resource.type === 'video') {
        iconClass = 'bx-video';
      } else if (resource.type === 'tutorial') {
        iconClass = 'bx-book-open';
      } else if (resource.type === 'documentation') {
        iconClass = 'bx-code-alt';
      } else if (resource.type === 'tool') {
        iconClass = 'bx-wrench';
      }
      
      const icon = document.createElement('i');
      icon.className = `bx ${iconClass}`;
      iconContainer.appendChild(icon);
      
      // Create content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'resource-content';
      
      const title = document.createElement('p');
      title.className = 'resource-title';
      title.textContent = resource.title;
      
      const type = document.createElement('p');
      type.className = 'resource-type';
      
      const typeIcon = document.createElement('i');
      typeIcon.className = `bx ${iconClass} text-gray-500`;
      
      type.appendChild(typeIcon);
      type.appendChild(document.createTextNode(resource.type || 'Link'));
      
      contentContainer.appendChild(title);
      contentContainer.appendChild(type);
      
      // Assemble the card
      resourceCard.appendChild(iconContainer);
      resourceCard.appendChild(contentContainer);
      
      resourcesContainer.appendChild(resourceCard);
    });
  }
  
  // Handle quiz submission
  submitQuizBtn.addEventListener('click', () => {
    let score = 0;
    const feedback = [];
    
    questionsData.forEach((q, questionIndex) => {
      const selectedOption = document.querySelector(`input[name="question-${questionIndex}"]:checked`);
      const questionResult = document.createElement('div');
      questionResult.className = 'mb-3 p-3 border-b';
      
      // Create the question text
      const questionText = document.createElement('p');
      questionText.className = 'font-medium mb-2';
      questionText.textContent = `${questionIndex + 1}. ${q.question}`;
      questionResult.appendChild(questionText);
      
      if (!selectedOption) {
        // No answer selected
        const noAnswer = document.createElement('div');
        noAnswer.className = 'flex items-center gap-2 text-yellow-600';
        
        const icon = document.createElement('i');
        icon.className = 'bx bx-error';
        
        const text = document.createElement('span');
        text.textContent = 'Not answered. Correct answer: ' + q.options[q.correctAnswer];
        
        noAnswer.appendChild(icon);
        noAnswer.appendChild(text);
        questionResult.appendChild(noAnswer);
      } else {
        const selectedIndex = parseInt(selectedOption.value);
        const isCorrect = selectedIndex === q.correctAnswer;
        
        if (isCorrect) {
          score++;
          const correct = document.createElement('div');
          correct.className = 'flex items-center gap-2 text-green-600';
          
          const icon = document.createElement('i');
          icon.className = 'bx bx-check-circle';
          
          const text = document.createElement('span');
          text.textContent = 'Correct! ' + q.options[q.correctAnswer];
          
          correct.appendChild(icon);
          correct.appendChild(text);
          questionResult.appendChild(correct);
        } else {
          const wrong = document.createElement('div');
          wrong.className = 'flex items-center gap-2 text-red-600';
          
          const iconWrong = document.createElement('i');
          iconWrong.className = 'bx bx-x-circle';
          
          const textWrong = document.createElement('span');
          textWrong.textContent = `Incorrect. You selected: ${q.options[selectedIndex]}`;
          
          wrong.appendChild(iconWrong);
          wrong.appendChild(textWrong);
          questionResult.appendChild(wrong);
          
          const correct = document.createElement('div');
          correct.className = 'flex items-center gap-2 text-green-600 mt-2';
          
          const iconCorrect = document.createElement('i');
          iconCorrect.className = 'bx bx-check-circle';
          
          const textCorrect = document.createElement('span');
          textCorrect.textContent = `Correct answer: ${q.options[q.correctAnswer]}`;
          
          correct.appendChild(iconCorrect);
          correct.appendChild(textCorrect);
          questionResult.appendChild(correct);
        }
      }
      
      feedback.push(questionResult);
    });
    
    // Update score and show feedback
    scoreDisplay.textContent = `${score}/${questionsData.length}`;
    
    quizFeedback.innerHTML = '';
    feedback.forEach(item => quizFeedback.appendChild(item));
    
    quizResults.classList.remove('hidden');
    
    // Scroll to results
    quizResults.scrollIntoView({ behavior: 'smooth' });
  });
  
  // Reset the quiz
  resetQuizBtn.addEventListener('click', () => {
    // Clear all selections
    document.querySelectorAll('input[type="radio"]').forEach(input => {
      input.checked = false;
    });
    
    // Remove selected styling
    document.querySelectorAll('.quiz-option').forEach(option => {
      option.classList.remove('quiz-option-selected');
    });
    
    // Hide results
    quizResults.classList.add('hidden');
    
    // Scroll back to questions
    quizContainer.scrollIntoView({ behavior: 'smooth' });
  });

  // Initialize voice synthesis when page loads
  if (synth) {
    // Load voices (needed for some browsers)
    function loadVoices() {
      return new Promise(resolve => {
        let voices = synth.getVoices();
        if (voices.length > 0) {
          resolve(voices);
          return;
        }
        
        // Chrome needs a listener for voiceschanged
        synth.onvoiceschanged = () => {
          voices = synth.getVoices();
          resolve(voices);
        };
        
        // Set a timeout in case onvoiceschanged doesn't fire
        setTimeout(() => {
          resolve(synth.getVoices());
        }, 1000);
      });
    }
    
    loadVoices().then(voices => {
      console.log(`Loaded ${voices.length} voices for speech synthesis`);
    });
  }

  // Format explanation text to convert markdown-style syntax to HTML
  function formatExplanation(text) {
    if (!text) return '';
    
    // Process code blocks with language specification
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, language, code) {
      const lang = language ? `language-${language}` : '';
      return `<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto"><code class="${lang}">${code.trim()}</code></pre>`;
    });
    
    // Convert ### headings to h3
    text = text.replace(/### (.+)$/gm, '<h3 class="text-xl font-bold mt-5 mb-2">$1</h3>');
    
    // Convert ## headings to h2
    text = text.replace(/## (.+)$/gm, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>');
    
    // Convert # headings to h1
    text = text.replace(/# (.+)$/gm, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>');
    
    // Convert **text** to bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *text* or _text_ to italic
    text = text.replace(/(\*|_)(.+?)\1/g, '<em>$2</em>');
    
    // Convert `code` to inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
    
    // Convert numbered lists
    text = text.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-5 list-decimal">$1</li>');
    
    // Convert bullet lists
    text = text.replace(/^-\s+(.+)$/gm, '<li class="ml-5 list-disc">$1</li>');
    
    // Wrap adjacent list items in ul/ol tags
    text = text.replace(/<li class="ml-5 list-disc">(.+?)<\/li>(\s*<li class="ml-5 list-disc">(.+?)<\/li>)+/g, 
      '<ul class="my-3">$&</ul>');
    text = text.replace(/<li class="ml-5 list-decimal">(.+?)<\/li>(\s*<li class="ml-5 list-decimal">(.+?)<\/li>)+/g, 
      '<ol class="my-3">$&</ol>');
    
    // Convert paragraphs (double line breaks)
    text = text.replace(/\n\n/g, '</p><p class="my-3">');
    
    // Wrap everything in a paragraph if not already
    if (!text.startsWith('<')) {
      text = `<p class="my-3">${text}</p>`;
    }
    
    return text;
  }
});