import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
  const leaderboardContainer = document.getElementById('leaderboard-container');
  const liveUserCountEl = document.getElementById('live-user-count');
  
  // Fetch and update live user count
  if (liveUserCountEl) {
    try {
      const coll = collection(db, "users");
      const snapshot = await getCountFromServer(coll);
      liveUserCountEl.textContent = snapshot.data().count.toLocaleString() + "+";
    } catch(error) {
      console.error("Error fetching user count:", error);
      liveUserCountEl.textContent = "1+"; // Fallback
    }
  }

  if (leaderboardContainer) {
    try {
      const q = query(collection(db, "users"), orderBy("points", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      
      let rank = 1;
      let html = '';
      querySnapshot.forEach((doc) => {
        const user = doc.data();
        html += `
          <div class="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-700 mb-3">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full ${rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-gray-300' : rank === 3 ? 'bg-yellow-600' : 'bg-green-100 text-green-800'} flex items-center justify-center font-bold mr-4">
                ${rank}
              </div>
              <div>
                <p class="font-semibold text-gray-800 dark:text-white">${user.displayName || 'Anonymous User'}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${user.badges ? user.badges.length : 0} Badges</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-green-600 dark:text-green-400">${user.points || 0}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Points</p>
            </div>
          </div>
        `;
        rank++;
      });
      
      if (html === '') {
        html = '<p class="text-center text-gray-500">No users found. Login and participate to be the first!</p>';
      }
      
      leaderboardContainer.innerHTML = html;
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      leaderboardContainer.innerHTML = '<p class="text-center text-red-500">Failed to load leaderboard. Check Firestore rules.</p>';
    }
  }
});
