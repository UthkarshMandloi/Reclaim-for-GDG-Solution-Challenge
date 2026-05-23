import { auth, db, storage } from './firebase-config.js';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

let allIdeas = [];
let currentChatContext = "";
let chatHistory = [];

document.addEventListener('DOMContentLoaded', async () => {
  const ideasGrid = document.getElementById('ideas-grid');
  const loadingIndicator = document.getElementById('loading-ideas');
  
  // Modals
  const contributeModal = document.getElementById('contribute-modal');
  const chatbotModal = document.getElementById('chatbot-modal');
  
  // Triggers
  document.getElementById('contribute-btn')?.addEventListener('click', () => {
    if(!auth.currentUser) {
      alert("Please log in from the Home page first to contribute and earn points!");
      return;
    }
    contributeModal.classList.remove('hidden');
  });
  
  document.getElementById('close-contribute-modal')?.addEventListener('click', () => {
    contributeModal.classList.add('hidden');
  });
  
  document.getElementById('close-chatbot-modal')?.addEventListener('click', () => {
    chatbotModal.classList.add('hidden');
  });

  // Load Ideas
  await fetchIdeas();

  async function fetchIdeas() {
    try {
      const q = query(collection(db, "upcycling_ideas"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      allIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fallback dummy data if empty (for prototype showcase)
      if (allIdeas.length === 0) {
        allIdeas = [
          {
            title: "Glass Bottle Planters",
            description: "Turn discarded glass bottles into beautiful plant holders for your home garden. Cut the top, sand the edges, and add soil!",
            material: "glass",
            difficulty: "beginner",
            imageUrl: "https://placehold.co/600x400/2E8B57/FFFFFF?text=Glass+Bottle+Planter",
            authorName: "Reclaim Admin"
          },
          {
            title: "Pallet Coffee Table",
            description: "Convert wooden shipping pallets into a rustic yet modern coffee table for your living room. Requires sanding and varnishing.",
            material: "wood",
            difficulty: "intermediate",
            imageUrl: "https://placehold.co/600x400/4682B4/FFFFFF?text=Pallet+Table",
            authorName: "Reclaim Admin"
          }
        ];
      }
      
      loadingIndicator.classList.add('hidden');
      renderIdeas(allIdeas);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      loadingIndicator.innerHTML = "<p class='text-red-500'>Failed to load ideas. Please check Firebase permissions.</p>";
    }
  }

  function renderIdeas(ideas) {
    ideasGrid.innerHTML = '';
    
    if (ideas.length === 0) {
      ideasGrid.innerHTML = '<p class="text-gray-500 col-span-3 text-center py-8">No ideas found for these filters.</p>';
      return;
    }

    ideas.forEach(idea => {
      const card = document.createElement('div');
      card.className = "bg-white rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 flex flex-col";
      
      const badgeColor = idea.difficulty === 'beginner' ? 'bg-green-600' : (idea.difficulty === 'intermediate' ? 'bg-blue-600' : 'bg-yellow-600');
      
      card.innerHTML = `
        <div class="relative h-48 overflow-hidden bg-gray-100">
          <img src="${idea.imageUrl}" alt="${idea.title}" class="w-full h-full object-cover">
          <div class="absolute top-0 right-0 ${badgeColor} text-white text-xs font-bold px-3 py-1 m-2 rounded-full capitalize">
            ${idea.difficulty}
          </div>
        </div>
        <div class="p-6 flex flex-col flex-1">
          <h3 class="text-xl font-semibold text-gray-800 mb-2">${idea.title}</h3>
          <p class="text-gray-600 text-sm mb-4 flex-1">${idea.description}</p>
          ${idea.videoUrl ? `<a href="${idea.videoUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm font-semibold mb-1 flex items-center"><svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path></svg>Watch Video</a>` : ''}
          ${idea.blogUrl ? `<a href="${idea.blogUrl}" target="_blank" class="text-purple-600 hover:text-purple-800 text-sm font-semibold mb-3 flex items-center"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>Read Blog</a>` : ''}
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full capitalize">${idea.material}</span>
            <span class="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">By: ${idea.authorName || 'Anonymous'}</span>
          </div>
          <button class="ask-doubt-btn w-full bg-green-100 hover:bg-green-200 text-green-800 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            Ask a Doubt (AI)
          </button>
        </div>
      `;
      
      // Attach Chatbot Event
      card.querySelector('.ask-doubt-btn').addEventListener('click', () => {
        openChatbot(idea);
      });

      ideasGrid.appendChild(card);
    });
  }

  // Filters
  const materialFilter = document.getElementById('filter-material');
  const difficultyFilter = document.getElementById('filter-difficulty');

  function applyFilters() {
    const mat = materialFilter.value;
    const diff = difficultyFilter.value;
    
    let filtered = allIdeas;
    if (mat !== 'all') filtered = filtered.filter(i => i.material === mat);
    if (diff !== 'all') filtered = filtered.filter(i => i.difficulty === diff);
    
    renderIdeas(filtered);
  }

  materialFilter.addEventListener('change', applyFilters);
  difficultyFilter.addEventListener('change', applyFilters);

  // Contribute Form Submit
  document.getElementById('contribute-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Must be logged in!");

    const title = document.getElementById('idea-title').value;
    const desc = document.getElementById('idea-desc').value;
    const material = document.getElementById('idea-material').value;
    const difficulty = document.getElementById('idea-difficulty').value;
    const videoUrl = document.getElementById('idea-video')?.value || null;
    const blogUrl = document.getElementById('idea-blog')?.value || null;
    const file = document.getElementById('idea-image').files[0];
    const submitBtn = e.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Uploading...";

    try {
      // 1. Upload Image
      const storageRef = ref(storage, `ideas/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // 2. Save Idea to Firestore
      await addDoc(collection(db, "upcycling_ideas"), {
        title,
        description: desc,
        material,
        difficulty,
        videoUrl,
        blogUrl,
        imageUrl,
        authorId: user.uid,
        authorName: user.displayName || user.email.split('@')[0],
        createdAt: new Date().toISOString()
      });

      // 3. Reward Points to User!
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { points: increment() }, { merge: true });

      alert("Idea submitted successfully! You earned 50 points.");
      contributeModal.classList.add('hidden');
      e.target.reset();
      
      // Refresh feed
      submitBtn.textContent = "Loading feed...";
      await fetchIdeas();
      
    } catch (error) {
      console.error(error);
      alert("Error submitting idea: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Idea (+50 Points)";
    }
  });

  // Chatbot Logic
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatContextTitle = document.getElementById('chat-context-title');

  function openChatbot(idea) {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
      alert("To use the AI Chatbot, please log in and save your Gemini API Key in your profile on the Home page!");
      return;
    }
    
    currentChatContext = `Project: ${idea.title}. Material: ${idea.material}. Description: ${idea.description}`;
    chatContextTitle.textContent = `Asking about: ${idea.title}`;
    
    // Reset chat
    chatMessages.innerHTML = `
      <div class="bg-green-100 p-3 rounded-lg rounded-tl-none self-start max-w-[85%] text-sm text-gray-800">
        Hi! I'm the Reclaim AI. I see you're interested in <b>${idea.title}</b>. Need step-by-step instructions, video search terms, or have a doubt?
      </div>
    `;
    chatHistory = [];
    
    chatbotModal.classList.remove('hidden');
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to UI
    appendMessage(message, 'user');
    chatInput.value = '';
    
    const apiKey = localStorage.getItem('geminiApiKey');
    
    // Show typing indicator
    const typingId = "typing-" + Date.now();
    chatMessages.innerHTML += `
      <div id="${typingId}" class="bg-green-100 p-3 rounded-lg rounded-tl-none self-start max-w-[85%] text-sm text-gray-800 animate-pulse">
        Thinking...
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      // Build prompt with context
      const prompt = `You are a helpful DIY Upcycling assistant. 
      Context of current project: ${currentChatContext}.
      User asks: ${message}.
      Provide concise, helpful tips, or recommend youtube search queries to find tutorials. Keep it short. Use basic HTML (<b>, <ul>, <li>, <br>) instead of markdown.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      document.getElementById(typingId)?.remove();
      
      if(data.error) throw new Error(data.error.message);
      
      const textResponse = data.candidates[0].content.parts[0].text;
      appendMessage(textResponse, 'bot');
      
    } catch (error) {
      document.getElementById(typingId)?.remove();
      appendMessage("Error: " + error.message, 'bot');
    }
  });

  function appendMessage(text, sender) {
    const div = document.createElement('div');
    if (sender === 'user') {
      div.className = "bg-green-600 text-white p-3 rounded-lg rounded-tr-none self-end max-w-[85%] text-sm ml-auto";
    } else {
      div.className = "bg-green-100 text-gray-800 p-3 rounded-lg rounded-tl-none self-start max-w-[85%] text-sm";
    }
    div.innerHTML = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
