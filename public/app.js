document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('ask-form');
  const loading = document.getElementById('loading');
  const responseDiv = document.getElementById('response');
  const explanation = document.getElementById('explanation');
  const questionsList = document.getElementById('questions');
  const errorDiv = document.getElementById('error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const course = document.getElementById('course').value;
    const question = document.getElementById('question').value;

    if (!question.trim()) {
      errorDiv.textContent = 'Please enter a question or topic.';
      errorDiv.classList.remove('hidden');
      return;
    }

    // Hide previous results and errors, show loading
    responseDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course, question }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch response');
      }

      const data = await response.json();

      // Update explanation
      explanation.textContent = data.explanation || 'No explanation provided.';
      
      // Update questions
      questionsList.innerHTML = '';
      if (data.questions && data.questions.length > 0) {
        data.questions.forEach((q) => {
          const li = document.createElement('li');
          li.textContent = q;
          li.classList.add('question-item');
          questionsList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'No practice questions available.';
        li.classList.add('question-item');
        questionsList.appendChild(li);
      }

      responseDiv.classList.remove('hidden');
    } catch (error) {
      console.error(error);
      errorDiv.textContent = error.message || 'An error occurred. Please try again.';
      errorDiv.classList.remove('hidden');
    } finally {
      loading.classList.add('hidden');
    }
  });
});