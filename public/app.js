document.addEventListener('DOMContentLoaded', () => {
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
      await navigator.clipboard.writeText(explanation.innerText);
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
    const content = explanation.innerText;
    
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 30);
    
    doc.save(`3mtt-study-${courseSelect.value.toLowerCase()}-${Date.now()}.pdf`);
    showNotification('PDF downloaded!');
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
        throw new Error(errorData.error || 'Failed to fetch response');
      }
      
      const data = await response.json();
      
      // Store response data for logging
      currentResponseData = {
        timestamp: new Date().toISOString(),
        data: data
      };
      
      // Update AI logs
      updateAILogs();
      
      // Update explanation
      explanation.textContent = data.explanation || 'No explanation provided.';
      
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
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
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
});