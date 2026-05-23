document.addEventListener('DOMContentLoaded', () => {
  const tryBtn = document.getElementById('try-ai-btn');
  const uploadContainer = document.getElementById('ai-upload-container');
  const imageInput = document.getElementById('waste-image-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsContainer = document.getElementById('ai-results-container');
  const resultsText = document.getElementById('ai-results-text');
  const loadingIndicator = document.getElementById('ai-loading');
  const imagePreview = document.getElementById('ai-image-preview');

  if(tryBtn) {
    tryBtn.addEventListener('click', () => {
      const apiKey = localStorage.getItem('geminiApiKey');
      if (!apiKey) {
        alert("Please log in and set your Gemini API key in your Profile Settings first!");
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.classList.remove('hidden');
        return;
      }
      uploadContainer.classList.toggle('hidden');
    });
  }

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.classList.remove('hidden');
      }
    });
  }

  if(analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      const apiKey = localStorage.getItem('geminiApiKey');
      if (!apiKey) {
        alert("Missing Gemini API Key. Please add it in settings.");
        return;
      }

      const file = imageInput.files[0];
      if (!file) {
        alert("Please select an image first.");
        return;
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        
        loadingIndicator.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        
        try {
          // Call Gemini API
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "You are an AI Waste Assistant. Analyze this image of waste. 1. Identify the material. 2. Provide 3 creative upcycling/DIY ideas. 3. Provide safe disposal/recycling methods if it cannot be upcycled. Keep it concise, engaging, and format it nicely as HTML (use <b>, <ul>, <li>, <h3> tags instead of markdown) so it can be directly rendered in a div." },
                  { inline_data: { mime_type: file.type, data: base64Data } }
                ]
              }]
            })
          });

          const data = await response.json();
          if(data.error) {
            if (data.error.code === 404 || data.error.message.includes("is not found")) {
               try {
                 const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                 const modelsData = await modelsResponse.json();
                 const available = modelsData.models ? modelsData.models.map(m => m.name.replace('models/','')).join(", ") : "None";
                 throw new Error(`Gemini 1.5 Flash is not available for this API Key.\n\nModels your key has access to: ${available}\n\nTip: Go to Google AI Studio (aistudio.google.com) and generate a brand new API key!`);
               } catch (e) {
                 if (e.message.includes("Gemini 1.5 Flash is not available")) throw e;
               }
            }
            throw new Error(data.error.message);
          }
          
          const textResponse = data.candidates[0].content.parts[0].text;
          
          // Display results
          resultsText.innerHTML = textResponse; 
          loadingIndicator.classList.add('hidden');
          resultsContainer.classList.remove('hidden');

        } catch (error) {
          loadingIndicator.classList.add('hidden');
          alert("Error analyzing image: \n" + error.message);
        }
      };
    });
  }
});
