# SATHI - Nepal's Premier Social Experiences Marketplace

SATHI is an elite social experience platform connecting travelers with verified local companions for authentic cultural tours, chiya spots, and safe hikes across Nepal.

---



## 🛠️ Zero-Configuration Out-of-the-Box Setup

Normally, setting up a Firebase app requires configuring custom API keys and credentials. 

To make your experience absolutely **seamless**, SATHI is pre-packaged with built-in sandbox Firebase fallbacks inside `src/firebase.ts` reading from `firebase-applet-config.json`. 

* **No `.env` file is required to start testing the app!**
* The local app will securely connect to the sandbox Firestore and Authentication out of the box.
* You can instantly create users, search/filter companions, book experiences, post co-experience moments, and send messages!

---



## 🌟 Key Architecture & Stack
* **Framework:** React 19 + TypeScript + Vite 6
* **Styling:** Tailwind CSS 4 (with modern light-luxury aesthetic tokens)
* **Icons:** Lucide React
* **Database & Auth:** Firebase (Firestore & Firebase Auth)
* **Animations:** Motion (from `motion/react`)
* **Interactive Maps:** Leaflet Maps (fully integrated for companion locations)
