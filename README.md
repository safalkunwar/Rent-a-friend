# SATHI - Nepal's Premier Social Experiences Marketplace

SATHI is an elite social experience platform connecting travelers with verified local companions for authentic cultural tours, chiya spots, and safe hikes across Nepal.

---

## 🚀 Quick Start Guide

To run the application locally on your computer instantly after downloading, follow these simple steps:

### 1. Prerequisites
Ensure you have **Node.js** installed on your system:
* Node.js version `18.x` or higher is recommended.
* You can download it from [nodejs.org](https://nodejs.org/).

### 2. Install Dependencies
Open your terminal (Command Prompt, PowerShell, or macOS/Linux Terminal) in the project root directory and run:
```bash
npm install
```

### 3. Run Locally (Zero Configuration Required!)
Start the development server:
```bash
npm run dev
```

Your browser will automatically open or you can navigate manually to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🛠️ Zero-Configuration Out-of-the-Box Setup

Normally, setting up a Firebase app requires configuring custom API keys and credentials. 

To make your experience absolutely **seamless**, SATHI is pre-packaged with built-in sandbox Firebase fallbacks inside `src/firebase.ts` reading from `firebase-applet-config.json`. 

* **No `.env` file is required to start testing the app!**
* The local app will securely connect to the sandbox Firestore and Authentication out of the box.
* You can instantly create users, search/filter companions, book experiences, post co-experience moments, and send messages!

---

## ⚙️ Custom Environment Configuration (Optional)

If you want to plug in your own custom Firebase project or Gemini API Keys, follow these steps:

1. Copy the template environment file:
   ```bash
   cp .env.example .env
   ```
2. Open the new `.env` file in your code editor and fill in your custom credentials:
   ```env
   # Customize with your own credentials:
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   VITE_FIREBASE_API_KEY="YOUR_API_KEY"
   VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
   # ...etc
   ```

---

## 📂 Available Scripts

Inside this project directory, you can run several useful commands:

| Command | Action |
|:---|:---|
| `npm run dev` | Runs the app in development mode on `http://localhost:3000` with hot-reloads. |
| `npm run build` | Compiles and optimizes the React application into the `dist` directory for production. |
| `npm run preview` | Previews the production-ready build locally. |
| `npm run lint` | Performs deep TypeScript compilation and type checks to guarantee zero code syntax errors. |
| `npm run test` | Runs the Vitest automated test suite. |

---

## 🏗️ Production Build & Deployment

To build SATHI for production hosting (such as on Netlify, Vercel, Firebase Hosting, or Cloud Run):

1. **Build the assets:**
   ```bash
   npm run build
   ```
2. This creates a highly optimized static build inside the `/dist` directory.
3. You can deploy this directory to any static hosting provider of your choice.

---

## 🌟 Key Architecture & Stack
* **Framework:** React 19 + TypeScript + Vite 6
* **Styling:** Tailwind CSS 4 (with modern light-luxury aesthetic tokens)
* **Icons:** Lucide React
* **Database & Auth:** Firebase (Firestore & Firebase Auth)
* **Animations:** Motion (from `motion/react`)
* **Interactive Maps:** Leaflet Maps (fully integrated for companion locations)
