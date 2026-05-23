import { auth, db, storage } from './firebase-config.js';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, setDoc, deleteDoc, increment, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

let allBlogs = [];

document.addEventListener('DOMContentLoaded', async () => {
  const blogsGrid = document.getElementById('blogs-grid');
  const loadingIndicator = document.getElementById('loading-blogs');
  const writeModal = document.getElementById('write-modal');
  const blogForm = document.getElementById('blog-form');
  const modalTitle = document.getElementById('modal-title');
  const categoryFilter = document.getElementById('filter-category');

  // Check URL params for pre-selected category
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get('category');
  if (initialCategory && categoryFilter) {
    categoryFilter.value = initialCategory;
  }

  categoryFilter?.addEventListener('change', renderBlogs);

  // Modal Triggers
  document.getElementById('write-blog-btn')?.addEventListener('click', () => {
    if(!auth.currentUser) {
      alert("Please log in from the Home page first to write a blog!");
      return;
    }
    blogForm.reset();
    document.getElementById('edit-blog-id').value = '';
    document.getElementById('blog-image').required = true;
    modalTitle.textContent = "Write a Blog Post";
    writeModal.classList.remove('hidden');
  });
  
  document.getElementById('close-write-modal')?.addEventListener('click', () => {
    writeModal.classList.add('hidden');
  });

  // Fetch & Render
  await fetchBlogs();

  async function fetchBlogs() {
    try {
      const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      allBlogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fallback dummy data if empty
      if (allBlogs.length === 0) {
        allBlogs = [
          {
            id: 'dummy1',
            title: "Zero-Waste Kitchen: 10 Simple Swaps",
            content: "Transform your kitchen into an eco-friendly space with these easy, budget-friendly swaps that reduce waste and plastic use without sacrificing convenience...",
            category: "Zero Waste",
            imageUrl: "https://placehold.co/800x600/2E8B57/FFFFFF?text=Sustainable+Kitchen",
            authorName: "Emma Morgan",
            authorId: 'system',
            createdAt: new Date().toISOString(),
            likes: []
          }
        ];
      }
      
      loadingIndicator.classList.add('hidden');
      renderBlogs();
    } catch (error) {
      console.error("Error fetching blogs:", error);
      loadingIndicator.innerHTML = "<p class='text-red-500'>Failed to load blogs. Please check Firebase permissions.</p>";
    }
  }

  function renderBlogs() {
    blogsGrid.innerHTML = '';
    
    const filterVal = categoryFilter ? categoryFilter.value : 'all';
    
    const filteredBlogs = allBlogs.filter(blog => {
      if (filterVal !== 'all' && blog.category !== filterVal) return false;
      return true;
    });

    if (filteredBlogs.length === 0) {
      blogsGrid.innerHTML = '<p class="text-gray-500 col-span-3 text-center py-8">No blogs found for this category.</p>';
      return;
    }

    const currentUser = auth.currentUser;

    filteredBlogs.forEach(blog => {
      const card = document.createElement('div');
      card.className = "bg-white rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 flex flex-col";
      
      const likeCount = blog.likes ? blog.likes.length : 0;
      const isLiked = currentUser && blog.likes && blog.likes.includes(currentUser.uid);
      const isAuthor = currentUser && currentUser.uid === blog.authorId;
      const dateStr = new Date(blog.createdAt).toLocaleDateString();

      card.innerHTML = `
        <div class="relative h-48 overflow-hidden bg-gray-100">
          <img src="${blog.imageUrl}" alt="${blog.title}" class="w-full h-full object-cover">
          <div class="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 m-2 rounded-full">
            ${blog.category}
          </div>
        </div>
        <div class="p-6 flex flex-col flex-1">
          <div class="flex justify-between items-center mb-2">
            <p class="text-sm text-gray-500">${dateStr}</p>
            <p class="text-xs text-gray-700 font-medium">By: ${blog.authorName}</p>
          </div>
          <h4 class="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">${blog.title}</h4>
          <p class="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">${blog.content}</p>

          <div class="flex justify-between items-center border-t pt-4 mt-auto">
            <button class="like-btn flex items-center text-sm ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} transition-colors" data-id="${blog.id}" data-author="${blog.authorId}">
              <svg class="w-5 h-5 mr-1 ${isLiked ? 'fill-current' : 'fill-none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              ${likeCount}
            </button>
            
            <div class="flex space-x-2">
              ${isAuthor ? `
                <button class="edit-btn text-blue-500 hover:text-blue-700 text-sm font-medium" data-id="${blog.id}">Edit</button>
                <button class="delete-btn text-red-500 hover:text-red-700 text-sm font-medium" data-id="${blog.id}">Delete</button>
              ` : ''}
              <button class="read-btn text-green-600 hover:text-green-800 text-sm font-medium" data-id="${blog.id}">Read Full</button>
            </div>
          </div>
        </div>
      `;
      
      if (isAuthor) {
        card.querySelector('.edit-btn')?.addEventListener('click', () => handleEdit(blog));
        card.querySelector('.delete-btn')?.addEventListener('click', () => handleDelete(blog.id));
      }
      
      card.querySelector('.like-btn').addEventListener('click', (e) => handleLike(e, blog));
      card.querySelector('.read-btn').addEventListener('click', () => alert("Full blog reader view coming soon!\\n\\n" + blog.content));

      blogsGrid.appendChild(card);
    });
  }

  async function handleLike(e, blog) {
    if (!auth.currentUser) {
      alert("Please log in to like articles!");
      return;
    }
    if (blog.id === 'dummy1') return alert("Cannot like dummy posts.");

    const btn = e.currentTarget;
    const isLiked = blog.likes && blog.likes.includes(auth.currentUser.uid);
    const blogRef = doc(db, "blogs", blog.id);

    const currentLikes = blog.likes ? blog.likes.length : 0;
    btn.innerHTML = `<svg class="w-5 h-5 mr-1 ${!isLiked ? 'fill-current' : 'fill-none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> ${isLiked ? currentLikes - 1 : currentLikes + 1}`;
    btn.classList.toggle('text-red-500');
    btn.classList.toggle('text-gray-500');

    try {
      if (isLiked) {
        await updateDoc(blogRef, { likes: arrayRemove(auth.currentUser.uid) });
        blog.likes = blog.likes.filter(id => id !== auth.currentUser.uid);
      } else {
        await updateDoc(blogRef, { likes: arrayUnion(auth.currentUser.uid) });
        if(!blog.likes) blog.likes = [];
        blog.likes.push(auth.currentUser.uid);

        if (blog.authorId !== auth.currentUser.uid) {
          const authorRef = doc(db, "users", blog.authorId);
          await setDoc(authorRef, { points: increment() }, { merge: true });
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error updating like status.");
      await fetchBlogs(); 
    }
  }

  function handleEdit(blog) {
    document.getElementById('edit-blog-id').value = blog.id;
    document.getElementById('blog-title').value = blog.title;
    document.getElementById('blog-category').value = blog.category;
    document.getElementById('blog-content').value = blog.content;
    document.getElementById('blog-image').required = false;
    
    modalTitle.textContent = "Edit Blog Post";
    writeModal.classList.remove('hidden');
  }

  async function handleDelete(blogId) {
    if (confirm("Are you sure you want to delete this blog post? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "blogs", blogId));
        alert("Blog post deleted.");
        await fetchBlogs();
      } catch (error) {
        console.error(error);
        alert("Error deleting blog.");
      }
    }
  }

  blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert("Must be logged in!");

    const editId = document.getElementById('edit-blog-id').value;
    const title = document.getElementById('blog-title').value;
    const category = document.getElementById('blog-category').value;
    const content = document.getElementById('blog-content').value;
    const file = document.getElementById('blog-image').files[0];
    const submitBtn = e.target.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
      let imageUrl = null;

      if (file) {
        // FIXED THE TEMPLATE LITERAL ESCAPING!
        const fileName = Date.now() + "_" + file.name;
        const storageRef = ref(storage, "blogs/" + fileName);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      }

      const blogData = {
        title,
        category,
        content,
        authorId: user.uid,
        authorName: user.displayName || user.email.split('@')[0],
      };
      if (imageUrl) blogData.imageUrl = imageUrl;

      if (editId) {
        await updateDoc(doc(db, "blogs", editId), blogData);
        alert("Blog updated successfully!");
      } else {
        blogData.createdAt = new Date().toISOString();
        blogData.likes = [];
        if (!imageUrl) throw new Error("Cover image is required for new blogs.");

        await addDoc(collection(db, "blogs"), blogData);
        
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { points: increment() }, { merge: true });
        
        alert("Blog published successfully! You earned 50 points.");
      }

      writeModal.classList.add('hidden');
      blogForm.reset();
      
      submitBtn.textContent = "Loading feed...";
      await fetchBlogs();
      
    } catch (error) {
      console.error(error);
      alert("Error saving blog: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Publish Blog Post";
    }
  });
});
