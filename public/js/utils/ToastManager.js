/**
 * Toast Notification Manager
 * Handles the creation and management of toast notifications for game events
 */

class ToastManager {
  constructor() {
    this.toastContainer = null;
    this.toasts = [];
    this.maxToasts = 5; // Maximum number of visible toasts at once
    this.initialize();
  }
  
  /**
   * Initialize the toast container
   */
  initialize() {
    // Create toast container if it doesn't exist
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column-reverse;
        gap: 10px;
        z-index: 10000;
        pointer-events: none;
        max-width: 100%;
      `;
      document.body.appendChild(this.toastContainer);
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .toast-notification {
          padding: 12px 16px;
          border-radius: 8px;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: flex-start;
          opacity: 0;
          transform: translateX(30px);
          transition: all 0.3s ease;
          overflow: hidden;
          margin-left: auto;
          width: 300px;
          max-width: 90vw;
          pointer-events: auto;
          position: relative;
        }
        
        .toast-notification.show {
          opacity: 1;
          transform: translateX(0);
        }
        
        .toast-notification.info {
          background-color: #2196F3;
        }
        
        .toast-notification.success {
          background-color: #4CAF50;
        }
        
        .toast-notification.warning {
          background-color: #FF9800;
        }
        
        .toast-notification.error {
          background-color: #F44336;
        }
        
        .toast-icon {
          margin-right: 12px;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .toast-content {
          flex-grow: 1;
        }
        
        .toast-message {
          margin: 0;
          line-height: 1.4;
        }
        
        .toast-timestamp {
          font-size: 11px;
          opacity: 0.8;
          margin-top: 4px;
        }
        
        .toast-close {
          background: none;
          border: none;
          color: white;
          opacity: 0.7;
          cursor: pointer;
          padding: 0;
          font-size: 18px;
          line-height: 1;
          transition: opacity 0.2s;
          margin-left: 8px;
          align-self: flex-start;
        }
        
        .toast-close:hover {
          opacity: 1;
        }
        
        .toast-notification::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: 100%;
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .toast-notification.with-timer::after {
          width: 100%;
          transition: width linear;
          background-color: rgba(255, 255, 255, 0.5);
        }
        
        @media (max-width: 768px) {
          #toast-container {
            bottom: 10px;
            left: 10px;
            right: 10px;
            align-items: center;
          }
          
          .toast-notification {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
   * @param {number} duration - Duration in ms before the toast auto-dismisses (0 for no auto-dismiss)
   * @param {boolean} playSound - Whether to play a notification sound
   * @returns {Object} The created toast element
   */
  show(message, type = 'info', duration = 5000, playSound = true) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    if (duration > 0) toast.classList.add('with-timer');
    
    // Create icon based on type
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    
    switch (type) {
      case 'info':
        icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"/></svg>';
        break;
      case 'success':
        icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
        break;
      case 'warning':
        icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>';
        break;
      case 'error':
        icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
        break;
    }
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    // Add message
    const msgElement = document.createElement('p');
    msgElement.className = 'toast-message';
    msgElement.textContent = message;
    content.appendChild(msgElement);
    
    // Add timestamp
    const timestamp = document.createElement('div');
    timestamp.className = 'toast-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    content.appendChild(timestamp);
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Dismiss';
    closeBtn.onclick = () => this.dismiss(toast);
    
    // Assemble toast
    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    
    // Add to container
    this.toastContainer.appendChild(toast);
    this.toasts.push(toast);
    
    // Limit number of toasts
    if (this.toasts.length > this.maxToasts) {
      const oldToast = this.toasts.shift();
      this.dismiss(oldToast);
    }
    
    // Show the toast with animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Play sound if requested
    if (playSound && window.playNotificationSound) {
      window.playNotificationSound(type);
    }
    
    // Auto-dismiss after duration if specified
    if (duration > 0) {
      // Animate the timer bar
      toast.style.setProperty('--timer-duration', `${duration}ms`);
      const timerBar = toast.querySelector(':after');
      if (timerBar) {
        timerBar.style.transition = `width ${duration}ms linear`;
        timerBar.style.width = '0%';
      }
      
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
    
    return toast;
  }
  
  /**
   * Dismiss a toast notification
   * @param {HTMLElement} toast - The toast element to dismiss
   */
  dismiss(toast) {
    if (!toast) return;
    
    // Start dismissal animation
    toast.classList.remove('show');
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Remove from toasts array
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  }
  
  /**
   * Clear all toast notifications
   */
  clearAll() {
    const toasts = [...this.toasts];
    toasts.forEach(toast => {
      this.dismiss(toast);
    });
    this.toasts = [];
  }
}

export default ToastManager;
