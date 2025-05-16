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
    // Function to toggle between simple and technical explanations with improved responsive UI
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
    
    // Add transition for smoother content change
    explanation.style.transition = 'opacity 0.3s ease';
    explanation.style.opacity = '0';
    
    // Use setTimeout to ensure the transition happens
    setTimeout(() => {
      if (currentExplanationType === 'simple') {
        currentExplanationType = 'technical';
        const formattedExplanation = formatExplanation(currentTechnicalExplanation);
        explanation.innerHTML = formattedExplanation;
        
        // Update button text and style with responsive design in mind
        const btnTextElement = toggleExplanationBtn.querySelector('.btn-text');
        if (btnTextElement) {
          btnTextElement.textContent = 'Switch to Simple';
        } else {
          toggleExplanationBtn.innerHTML = '<i class="bx bx-refresh"></i> <span class="btn-text">Switch to Simple</span>';
        }
        
        toggleExplanationBtn.classList.remove('btn-primary');
        toggleExplanationBtn.classList.add('btn-secondary');
        toggleExplanationBtn.setAttribute('title', 'Switch to simple explanation');
      } else {
        currentExplanationType = 'simple';
        const formattedExplanation = formatExplanation(currentSimpleExplanation);
        explanation.innerHTML = formattedExplanation;
        
        // Update button text and style with responsive design in mind
        const btnTextElement = toggleExplanationBtn.querySelector('.btn-text');
        if (btnTextElement) {
          btnTextElement.textContent = 'Switch to Technical';
        } else {
          toggleExplanationBtn.innerHTML = '<i class="bx bx-refresh"></i> <span class="btn-text">Switch to Technical</span>';
        }
        
        toggleExplanationBtn.classList.remove('btn-secondary');
        toggleExplanationBtn.classList.add('btn-primary');
        toggleExplanationBtn.setAttribute('title', 'Switch to technical explanation');
      }
      
      // Apply syntax highlighting if highlight.js is available
      if (typeof hljs !== 'undefined' && explanation) {
        explanation.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      
      // Restore opacity to show the content
      setTimeout(() => {
        explanation.style.opacity = '1';
      }, 50);
      
      // Scroll to top of explanation on small screens
      if (window.innerWidth <= 640) {
        explanation.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
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
        throw new Error(errorData.error || 'Failed to fetch response');
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
        // Show toggle button if we have both explanations with responsive design in mind
      const toggleExplanationBtn = document.getElementById('toggle-explanation-btn');
      if (currentSimpleExplanation && currentTechnicalExplanation && toggleExplanationBtn) {
        toggleExplanationBtn.style.display = 'inline-flex';
        
        // Set the correct button text based on which explanation is currently shown
        if (currentExplanationType === 'simple') {
          // Set responsive button text
          if (window.innerWidth <= 480) {
            toggleExplanationBtn.innerHTML = '<i class="bx bx-refresh"></i> <span class="btn-text">Switch to Technical</span>';
          } else {
            toggleExplanationBtn.innerHTML = '<i class="bx bx-refresh"></i> <span class="btn-text">Switch to Technical Explanation</span>';
          }
          toggleExplanationBtn.classList.remove('btn-secondary');
          toggleExplanationBtn.classList.add('btn-primary');
        } else {
          // Set responsive button text
          if (window.innerWidth <= 480) {
            toggleExplanationBtn.innerHTML = '<i class="bx bx-refresh"></i> <span class="btn-text">Switch to Simple</span>';
          } else {
            toggleExplanationBtn.innerHTML = '<i class="bx bx-refresh"></i> <span class="btn-text">Switch to Simple Explanation</span>';
          }
          toggleExplanationBtn.classList.remove('btn-primary');
          toggleExplanationBtn.classList.add('btn-secondary');
        }
      }
      
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
    // Show enhanced error message with responsive design
  function showError(message) {
    // Check if the error is about course relevance
    const isRelevanceError = message.includes("doesn't seem to be related to");
    
    // Create and configure error message with improved styling
    errorText.innerHTML = ''; // Clear previous content
    
    // Add icon
    const errorIcon = document.createElement('i');
    errorIcon.className = 'bx bx-error-circle error-icon';
    errorText.appendChild(errorIcon);
    
    // Add message container for better layout
    const messageContainer = document.createElement('div');
    messageContainer.className = 'error-message-container';
    
    // Split the message for better formatting if it's a relevance error
    if (isRelevanceError) {
      const parts = message.split('Please try:');
      
      // Main error message
      const mainError = document.createElement('div');
      mainError.className = 'error-main';
      mainError.textContent = parts[0].trim();
      messageContainer.appendChild(mainError);
      
      if (parts.length > 1) {
        // Suggestions section
        const suggestions = document.createElement('div');
        suggestions.className = 'error-suggestions';
        
        const suggestionsTitle = document.createElement('strong');
        suggestionsTitle.textContent = 'Please try:';
        suggestions.appendChild(suggestionsTitle);
        
        // Convert suggestions to a bulleted list for better readability
        const suggestionsList = parts[1].split('-').filter(item => item.trim());
        if (suggestionsList.length > 0) {
          const ul = document.createElement('ul');
          ul.className = 'suggestions-list';
          
          suggestionsList.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.trim();
            ul.appendChild(li);
          });
          
          suggestions.appendChild(ul);
        } else {
          suggestions.appendChild(document.createTextNode(' ' + parts[1].trim()));
        }
        
        messageContainer.appendChild(suggestions);
      }
    } else {
      // Regular error message
      messageContainer.textContent = message;
    }
    
    errorText.appendChild(messageContainer);
    
    // For relevance errors, also highlight the course dropdown
    if (isRelevanceError) {
      courseSelect.classList.add('error-highlight');
      // Remove the highlight after the user changes the selection
      courseSelect.addEventListener('change', () => {
        courseSelect.classList.remove('error-highlight');
      }, { once: true });
    }
    
    // Show the error container
    errorDiv.classList.remove('hidden');
    
    // Scroll to error on mobile
    if (window.innerWidth <= 640) {
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
    // Show enhanced notification with mobile-friendly styling
  function showNotification(message, isError = false) {
    // Create notification element
    const notification = document.createElement('div');
    
    // Position notification differently based on screen size
    const isMobile = window.innerWidth <= 640;
    let notificationClass = `notification ${isError ? 'error' : 'success'}`;
    
    if (isMobile) {
      // On mobile, show at bottom center
      notificationClass += ' notification-mobile';
    } else {
      // On desktop, show at top right corner
      notificationClass += ' notification-desktop';
    }
    
    notification.className = notificationClass;
    
    // Create inner container for better styling
    const container = document.createElement('div');
    container.className = 'notification-container';
    
    // Add icon
    const icon = document.createElement('i');
    icon.className = `bx ${isError ? 'bx-error-circle' : 'bx-check-circle'}`;
    container.appendChild(icon);
    
    // Add text content
    const textContent = document.createElement('span');
    textContent.textContent = message;
    textContent.className = 'notification-text';
    container.appendChild(textContent);
    
    // Add close button for extended messages
    if (message.length > 50) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.innerHTML = '<i class="bx bx-x"></i>';
      closeBtn.addEventListener('click', () => {
        notification.classList.add('notification-hiding');
        setTimeout(() => notification.remove(), 300);
      });
      container.appendChild(closeBtn);
    }
    
    // Add container to notification
    notification.appendChild(container);
    
    // Add to document
    document.body.appendChild(notification);
    
    // Apply animation class after a brief delay for the entrance animation
    setTimeout(() => {
      notification.classList.add('notification-visible');
    }, 10);
    
    // Remove after an appropriate duration
    const duration = Math.min(Math.max(message.length * 60, 3000), 8000);
    
    setTimeout(() => {
      notification.classList.add('notification-hiding');
      setTimeout(() => notification.remove(), 300);
    }, duration);
    
    // Add styles if not already added
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .notification {
          position: fixed;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          color: white;
          max-width: 90%;
          z-index: 9999;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.3s, transform 0.3s;
        }
        
        .notification-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .notification-desktop {
          top: 1rem;
          right: 1rem;
        }
        
        .notification-mobile {
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
        }
        
        .notification.success {
          background-color: var(--primary-color);
        }
        
        .notification.error {
          background-color: var(--danger);
        }
        
        .notification-visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        .notification-mobile.notification-visible {
          transform: translateX(-50%) translateY(0);
        }
        
        .notification-hiding {
          opacity: 0;
        }
        
        .notification-text {
          flex: 1;
        }
        
        .notification-close {
          background: none;
          border: none;
          color: white;
          opacity: 0.7;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: opacity 0.2s;
        }
        
        .notification-close:hover {
          opacity: 1;
        }
        
        @media (prefers-reduced-motion) {
          .notification {
            transition: opacity 0.1s;
            transform: none;
          }
          
          .notification-mobile {
            transform: translateX(-50%);
          }
          
          .notification-mobile.notification-visible {
            transform: translateX(-50%);
          }
        }
      `;
      document.head.appendChild(style);
    }
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
  // Format explanation text to convert markdown-style syntax to HTML with improved mobile support
  function formatExplanation(text) {
    if (!text) return '';
    
    // Process code blocks with language specification and mobile scroll indicators
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, language, code) {
      const lang = language ? `language-${language}` : '';
      return `<div class="code-wrapper">
        <div class="code-header">
          <span class="code-language">${language || 'code'}</span>
          <button class="code-copy-btn" title="Copy code">
            <i class='bx bx-copy'></i>
          </button>
        </div>
        <pre class="bg-gray-100 p-3 rounded-md overflow-x-auto"><code class="${lang}">${code.trim()}</code></pre>
        <div class="mobile-scroll-indicator">
          <span><i class='bx bx-chevrons-right'></i> scroll <i class='bx bx-chevrons-left'></i></span>
        </div>
      </div>`;
    });
    
    // Convert ### headings to h3 with responsive text size classes
    text = text.replace(/### (.+)$/gm, '<h3 class="responsive-heading-3">$1</h3>');
    
    // Convert ## headings to h2 with responsive text size classes
    text = text.replace(/## (.+)$/gm, '<h2 class="responsive-heading-2">$1</h2>');
    
    // Convert # headings to h1 with responsive text size classes
    text = text.replace(/# (.+)$/gm, '<h1 class="responsive-heading-1">$1</h1>');
    
    // Convert **text** to bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *text* or _text_ to italic
    text = text.replace(/(\*|_)(.+?)\1/g, '<em>$2</em>');
    
    // Convert `code` to inline code with copy functionality on mobile
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Convert numbered lists with better mobile indentation
    text = text.replace(/^\d+\.\s+(.+)$/gm, '<li class="responsive-list-item numbered">$1</li>');
    
    // Convert bullet lists with better mobile indentation
    text = text.replace(/^-\s+(.+)$/gm, '<li class="responsive-list-item bulleted">$1</li>');
    
    // Wrap adjacent list items in ul/ol tags
    text = text.replace(/<li class="responsive-list-item bulleted">(.+?)<\/li>(\s*<li class="responsive-list-item bulleted">(.+?)<\/li>)+/g, 
      '<ul class="responsive-list">$&</ul>');
    text = text.replace(/<li class="responsive-list-item numbered">(.+?)<\/li>(\s*<li class="responsive-list-item numbered">(.+?)<\/li>)+/g, 
      '<ol class="responsive-list">$&</ol>');
    
    // Handle tables for responsive display
    // Replace markdown tables with responsive HTML tables
    text = text.replace(/\|(.+?)\|(\s*\n\s*)\|([\s-]+)\|(\s*\n\s*)((?:\|.+?\|\s*\n\s*)+)/gm, function(match, header, nl1, separator, nl2, body) {
      const headers = header.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
      const bodyRows = body.trim().split('\n');
      
      let tableHtml = '<div class="table-responsive"><table class="markdown-table">';
      
      // Add header row
      tableHtml += '<thead><tr>';
      headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
      });
      tableHtml += '</tr></thead>';
      
      // Add body rows
      tableHtml += '<tbody>';
      bodyRows.forEach(row => {
        const cells = row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<td>${cell}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      
      return tableHtml;
    });
    
    // Convert blockquotes
    text = text.replace(/^>\s+(.+)$/gm, '<blockquote class="responsive-blockquote">$1</blockquote>');
    
    // Convert paragraphs (double line breaks)
    text = text.replace(/\n\n/g, '</p><p class="responsive-paragraph">');
    
    // Wrap everything in a paragraph if not already
    if (!text.startsWith('<')) {
      text = `<p class="responsive-paragraph">${text}</p>`;
    }
    
    // Add event listeners for code copy buttons after the DOM is updated
    setTimeout(() => {
      document.querySelectorAll('.code-copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const codeBlock = e.target.closest('.code-wrapper').querySelector('code');
          navigator.clipboard.writeText(codeBlock.textContent)
            .then(() => {
              // Show success feedback
              const originalIcon = button.innerHTML;
              button.innerHTML = '<i class="bx bx-check" style="color: var(--success);"></i>';
              setTimeout(() => {
                button.innerHTML = originalIcon;
              }, 2000);
            })
            .catch(err => console.error('Failed to copy code: ', err));
        });
      });
    }, 100);
    
    return text;
  }

  // Handle responsive UI for different screen sizes
  function updateResponsiveUI() {
    const toggleExplanationBtn = document.getElementById('toggle-explanation-btn');
    
    if (toggleExplanationBtn) {
      // Update button text based on screen size
      const btnTextElement = toggleExplanationBtn.querySelector('.btn-text');
      
      if (btnTextElement) {
        if (window.innerWidth <= 480) {
          // For very small screens, use shorter text
          if (currentExplanationType === 'simple') {
            btnTextElement.textContent = 'Switch to Technical';
          } else {
            btnTextElement.textContent = 'Switch to Simple';
          }
        } else {
          // For larger screens, use full text
          if (currentExplanationType === 'simple') {
            btnTextElement.textContent = 'Switch to Technical Explanation';
          } else {
            btnTextElement.textContent = 'Switch to Simple Explanation';
          }
        }
      }
    }
    
    // Update code block scroll indicators
    const codeBlocks = document.querySelectorAll('.explanation-content pre');
    codeBlocks.forEach(block => {
      const scrollIndicator = block.parentElement?.querySelector('.mobile-scroll-indicator');
      if (scrollIndicator) {
        if (window.innerWidth <= 640 && block.scrollWidth > block.clientWidth) {
          scrollIndicator.style.display = 'flex';
        } else {
          scrollIndicator.style.display = 'none';
        }
      }
    });
  }

  // Listen for window resize events to update UI
  let resizeTimeout;
  window.addEventListener('resize', () => {
    // Debounce resize events
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateResponsiveUI, 250);
  });
  
  // Initialize responsive UI on page load
  document.addEventListener('DOMContentLoaded', updateResponsiveUI);

  // Handle device orientation changes on mobile
  window.addEventListener('orientationchange', () => {
    // Force a UI update after orientation change is complete
    setTimeout(() => {
      updateResponsiveUI();
      
      // Check if we need to render code syntax highlighting again
      if (typeof hljs !== 'undefined' && explanation) {
        explanation.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }
      
      // Update any open modals/dropdowns position
      if (!exportDropdown.classList.contains('hidden')) {
        // Position dropdown correctly after orientation change
        const btnRect = exportBtn.getBoundingClientRect();
        exportDropdown.style.top = `${btnRect.bottom + window.scrollY}px`;
        exportDropdown.style.right = `${window.innerWidth - btnRect.right}px`;
      }
    }, 300); // Wait for the orientation change to complete
  });
  
  // Add touchstart listeners for mobile devices to enhance touch feedback
  document.addEventListener('DOMContentLoaded', () => {
    const addTouchFeedback = () => {
      const touchElements = document.querySelectorAll('.btn, .resource-card, .quiz-option, .social-link');
      
      touchElements.forEach(el => {
        el.addEventListener('touchstart', () => {
          el.classList.add('touch-active');
        }, { passive: true });
        
        el.addEventListener('touchend', () => {
          el.classList.remove('touch-active');
        }, { passive: true });
        
        el.addEventListener('touchcancel', () => {
          el.classList.remove('touch-active');
        }, { passive: true });
      });
    };
    
    // Initial setup
    addTouchFeedback();
    
    // Re-add listeners when content changes (for dynamically added elements)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          addTouchFeedback();
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
  });

  // Function to test responsiveness (development only)
  function testResponsiveness() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    console.log(`%cResponsiveness Test`, 'font-size: 16px; font-weight: bold; color: #5cb85c;');
    console.log(`Viewport Size: ${viewportWidth}px × ${viewportHeight}px`);
    
    // Check viewport category
    let deviceCategory = 'Unknown';
    if (viewportWidth <= 480) deviceCategory = 'Small Mobile';
    else if (viewportWidth <= 640) deviceCategory = 'Mobile';
    else if (viewportWidth <= 768) deviceCategory = 'Large Mobile/Small Tablet';
    else if (viewportWidth <= 1024) deviceCategory = 'Tablet';
    else if (viewportWidth <= 1440) deviceCategory = 'Laptop/Desktop';
    else deviceCategory = 'Large Desktop';
    
    console.log(`Device Category: ${deviceCategory}`);
    
    // Test overflow issues
    const overflowElements = Array.from(document.querySelectorAll('*')).filter(
      el => el.offsetWidth > viewportWidth
    );
    
    if (overflowElements.length > 0) {
      console.warn(`%cFound ${overflowElements.length} elements causing horizontal overflow:`, 'color: orange; font-weight: bold;');
      overflowElements.forEach(el => {
        console.warn(`Element ${el.tagName}${el.id ? '#'+el.id : ''}${el.className ? '.'+el.className.replace(/ /g, '.') : ''} overflows by ${el.offsetWidth - viewportWidth}px`);
      });
    } else {
      console.log(`%c✓ No horizontal overflow detected`, 'color: green;');
    }
    
    // Check for touch features
    console.log(`Touch Support: ${('ontouchstart' in window) ? 'Yes' : 'No'}`);
    
    // Check for other responsive features
    const cssVars = getComputedStyle(document.documentElement);
    const primaryColor = cssVars.getPropertyValue('--primary-color');
    
    console.log(`Loaded CSS Variables: ${primaryColor ? '✓' : '✗'}`);
    console.log(`Responsive Media Queries Active: ${
      window.matchMedia('(max-width: 640px)').matches ? 'Mobile' : 
      window.matchMedia('(max-width: 1024px)').matches ? 'Tablet' : 'Desktop'
    }`);
    
    // For development testing only - remove in production
    if (localStorage.getItem('devMode') === 'true') {
      // Add viewport size display
      let sizeIndicator = document.getElementById('viewport-size-indicator');
      if (!sizeIndicator) {
        sizeIndicator = document.createElement('div');
        sizeIndicator.id = 'viewport-size-indicator';
        sizeIndicator.style.position = 'fixed';
        sizeIndicator.style.bottom = '10px';
        sizeIndicator.style.left = '10px';
        sizeIndicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
        sizeIndicator.style.color = 'white';
        sizeIndicator.style.padding = '5px 10px';
        sizeIndicator.style.borderRadius = '4px';
        sizeIndicator.style.fontSize = '12px';
        sizeIndicator.style.zIndex = '9999';
        document.body.appendChild(sizeIndicator);
      }
      
      function updateSizeIndicator() {
        sizeIndicator.textContent = `${window.innerWidth}×${window.innerHeight}px`;
      }
      
      updateSizeIndicator();
      window.addEventListener('resize', updateSizeIndicator);
    }
  }
  
  // Run responsiveness test in development environments only
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('load', testResponsiveness);
    window.addEventListener('resize', () => {
      clearTimeout(window.resizeTestTimer);
      window.resizeTestTimer = setTimeout(testResponsiveness, 500);
    });
  }
});

// Mobile swipe gesture support for explanation content
function enableSwipeGestures() {
  const explanationContent = document.getElementById('explanation');
  if (!explanationContent) return;
  
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  
  // Minimum distance to be considered a swipe
  const minSwipeDistance = 100;
  // Maximum vertical deviation allowed for horizontal swipe
  const maxVerticalDeviation = 50;
  
  explanationContent.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  
  explanationContent.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    
    const horizontalDistance = Math.abs(touchEndX - touchStartX);
    const verticalDistance = Math.abs(touchEndY - touchStartY);
    
    // Only consider it a horizontal swipe if vertical movement is limited
    if (horizontalDistance > minSwipeDistance && verticalDistance < maxVerticalDeviation) {
      // Left to right swipe
      if (touchEndX > touchStartX) {
        // If we're showing technical explanation, switch to simple
        if (currentExplanationType === 'technical' && 
            currentSimpleExplanation && 
            currentTechnicalExplanation) {
          toggleExplanationType();
          showNotification('Switched to simple explanation');
        }
      }
      // Right to left swipe
      else if (touchStartX > touchEndX) {
        // If we're showing simple explanation, switch to technical
        if (currentExplanationType === 'simple' && 
            currentSimpleExplanation && 
            currentTechnicalExplanation) {
          toggleExplanationType();
          showNotification('Switched to technical explanation');
        }
      }
    }
  }, { passive: true });
}

// Initialize swipe gestures when the explanation loads
document.addEventListener('DOMContentLoaded', () => {
  // Enable swipe gestures on touch devices
  if ('ontouchstart' in window) {
    enableSwipeGestures();
    
    // Re-initialize when content is updated
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.id === 'explanation') {
          enableSwipeGestures();
        }
      });
    });
    
    const explanationContent = document.getElementById('explanation');
    if (explanationContent) {
      observer.observe(explanationContent, { childList: true });
    }
  }
});