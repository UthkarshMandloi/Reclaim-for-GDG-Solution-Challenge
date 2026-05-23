import { db, storage, auth } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', async () => {
  const marketplaceContainer = document.getElementById('marketplace-container');
  const sellModal = document.getElementById('sell-modal');
  const openSellBtn = document.getElementById('open-sell-modal-btn');
  const sellForm = document.getElementById('sell-item-form');
  const sellLoading = document.getElementById('sell-loading');

  // Load Marketplace Items
  async function loadMarketplace() {
    if (marketplaceContainer) {
      try {
        const q = query(collection(db, "marketplace"), orderBy("createdAt", "desc"), limit(8));
        const querySnapshot = await getDocs(q);
        
        let html = '';
        querySnapshot.forEach((doc) => {
          const item = doc.data();
          html += `
            <div class="bg-white dark:bg-neutral-700 rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 flex flex-col">
              <div class="relative h-48 overflow-hidden bg-gray-200">
                <img src="${item.imageUrl}" alt="${item.title}" onerror="this.onerror=null; this.src='https://placehold.co/600x400/2E8B57/FFFFFF?text=Item'" class="w-full h-full object-cover">
                <div class="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-2 py-1 m-2 rounded">
                  ₹${item.price}
                </div>
              </div>
              <div class="p-4 flex-grow flex flex-col">
                <h4 class="text-lg font-medium text-gray-800 dark:text-white mb-1">${item.title}</h4>
                <p class="text-gray-600 dark:text-gray-300 text-sm mb-3 flex-grow">${item.description}</p>
                <div class="flex justify-between items-center mt-4">
                  <div class="flex items-center">
                    <div class="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs mr-2 font-bold">${item.sellerName ? item.sellerName.charAt(0).toUpperCase() : 'U'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${item.sellerName || 'Anonymous'}</p>
                  </div>
                  <button class="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-200 transition">Contact</button>
                </div>
              </div>
            </div>
          `;
        });
        
        if (html !== '') {
          marketplaceContainer.innerHTML = html;
        }
      } catch (error) {
        console.error("Error loading marketplace:", error);
      }
    }
  }

  await loadMarketplace();

  // Sell Item Flow
  if (openSellBtn) {
    openSellBtn.addEventListener('click', () => {
      const user = auth.currentUser;
      if (!user) {
        alert("Please login to sell an item.");
        document.getElementById('login-modal')?.classList.remove('hidden');
        return;
      }
      if (sellModal) sellModal.classList.remove('hidden');
    });
  }

  if (sellForm) {
    sellForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return;

      const title = e.target.title.value;
      const description = e.target.description.value;
      const price = e.target.price.value;
      const imageFile = e.target.image.files[0];

      if (!imageFile) {
        alert("Please upload an image.");
        return;
      }

      if (sellLoading) sellLoading.classList.remove('hidden');
      const submitBtn = sellForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        // Upload image to Storage
        const imageRef = ref(storage, `marketplace/${user.uid}_${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        const imageUrl = await getDownloadURL(imageRef);

        // Add to Firestore
        await addDoc(collection(db, "marketplace"), {
          title,
          description,
          price: parseFloat(price),
          imageUrl,
          sellerId: user.uid,
          sellerName: user.displayName || user.email.split('@')[0],
          createdAt: new Date().toISOString()
        });

        alert("Item listed successfully!");
        sellModal.classList.add('hidden');
        sellForm.reset();
        await loadMarketplace(); // Refresh list
      } catch (error) {
        alert("Error listing item: " + error.message);
      } finally {
        if (sellLoading) sellLoading.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
