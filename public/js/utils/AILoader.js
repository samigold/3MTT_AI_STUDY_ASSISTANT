/**
 * AI Loader Component
 * Shows an animated loader when AI is generating content
 */

class AILoader {
  constructor() {
    this.loaderElement = null;
    this.active = false;
    this.initialize();
  }
  
  /**
   * Initialize the loader component
   */
  initialize() {
    // Create loader element
    this.loaderElement = document.createElement('div');
    this.loaderElement.id = 'ai-loader';
    this.loaderElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      z-index: 10000;
      transition: opacity 0.3s ease;
    `;
    
    // Create loader spinner and animation
    const spinner = document.createElement('div');
    spinner.className = 'ai-loader-spinner';
    spinner.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: var(--game-primary, #5cb85c);
      animation: ai-loader-spin 1s infinite linear;
    `;
    
    // Create message element
    const message = document.createElement('div');
    message.className = 'ai-loader-message';
    message.style.cssText = `
      margin-top: 20px;
      color: white;
      font-size: 18px;
      font-weight: 500;
      text-align: center;
      max-width: 300px;
    `;
    message.textContent = 'AI is thinking...';
    
    // Create animated dots
    const dots = document.createElement('div');
    dots.className = 'ai-loader-dots';
    dots.style.cssText = `
      margin-top: 10px;
      color: var(--game-primary, #5cb85c);
      font-size: 24px;
      height: 24px;
      letter-spacing: 4px;
    `;
    dots.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ai-loader-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes ai-loader-dot {
        0%, 20% { opacity: 0; transform: translateY(5px); }
        50% { opacity: 1; transform: translateY(0); }
        80%, 100% { opacity: 0; transform: translateY(-5px); }
      }
      
      .ai-loader-dots span {
        animation: ai-loader-dot 1.4s infinite ease-in-out;
        display: inline-block;
      }
      
      .ai-loader-dots span:nth-child(1) {
        animation-delay: 0s;
      }
      
      .ai-loader-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .ai-loader-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      #ai-loader.visible {
        opacity: 1;
        pointer-events: auto;
      }
    `;
    
    // Assemble and append to DOM
    this.loaderElement.appendChild(spinner);
    this.loaderElement.appendChild(message);
    this.loaderElement.appendChild(dots);
    document.head.appendChild(style);
    document.body.appendChild(this.loaderElement);
  }
  
  /**
   * Show the AI loader
   * @param {string} customMessage - Optional custom message to display
   */
  show(customMessage = null) {
    if (customMessage) {
      const messageElement = this.loaderElement.querySelector('.ai-loader-message');
      if (messageElement) {
        messageElement.textContent = customMessage;
      }
    }
    
    this.loaderElement.classList.add('visible');
    this.active = true;
  }
  
  /**
   * Hide the AI loader
   */
  hide() {
    this.loaderElement.classList.remove('visible');
    this.active = false;
    
    // Reset to default message
    setTimeout(() => {
      if (!this.active) {
        const messageElement = this.loaderElement.querySelector('.ai-loader-message');
        if (messageElement) {
          messageElement.textContent = 'AI is thinking...';
        }
      }
    }, 300);
  }
  
  /**
   * Update the loader message
   * @param {string} message - New message to display
   */
  updateMessage(message) {
    const messageElement = this.loaderElement.querySelector('.ai-loader-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }
}

export default AILoader;
