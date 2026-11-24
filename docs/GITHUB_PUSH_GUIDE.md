# GitHub Push & Repository Setup Guide

Follow this step-by-step guide to push this complete project to your GitHub repository.

---

### Prerequisites
1. Ensure **Git** is installed on your computer.
   - If not installed, download it from [git-scm.com](https://git-scm.com/downloads) or install via terminal:
     ```powershell
     winget install --id Git.Git -e --source winget
     ```
2. A **GitHub account** ([github.com](https://github.com)).

---

### Step 1: Create a New Repository on GitHub
1. Log in to [GitHub](https://github.com).
2. Click the **`+`** icon at the top-right and select **New repository**.
3. Repository name: `iot-validation-system` (or any preferred name).
4. Select **Public** or **Private**.
5. **Do NOT** check "Add a README file" or ".gitignore" (these are already generated for you).
6. Click **Create repository**.
7. Copy your repository's URL (e.g. `https://github.com/<your-username>/iot-validation-system.git`).

---

### Step 2: Initialize Git and Commit Locally

Open PowerShell or Command Prompt in this project root directory (`c:\Users\gr777\Downloads\arsath`):

```powershell
# 1. Initialize local git repository
git init

# 2. Stage all project files (node_modules is excluded by .gitignore)
git add .

# 3. Create initial commit
git commit -m "feat: complete IoT device communication monitoring & validation system (CN, FSWD, FLAT)"

# 4. Set main branch
git branch -M main
```

---

### Step 3: Link Remote & Push to GitHub

Replace `<YOUR_GITHUB_REPO_URL>` with your repository URL:

```powershell
# 1. Add your GitHub remote repository
git remote add origin https://github.com/<your-username>/iot-validation-system.git

# 2. Push code to main branch
git push -u origin main
```

*(If prompted, log in with your GitHub credentials or Personal Access Token).*

---

### Step 4: Verification
Visit your repository on GitHub:
- All source code in `backend/` and `frontend/` will be visible.
- The `README.md` will display the complete project overview, architecture diagrams, and academic mapping.
- Documentation reports (`CN_REPORT.md`, `FLAT_REPORT.md`, `FSWD_REPORT.md`) will be accessible in `docs/`.

---

### For Anyone Cloning Your Repository
Anyone who clones your repository can launch it immediately:

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/iot-validation-system.git
cd iot-validation-system

# 2. Install dependencies for backend and frontend
npm run install:all

# 3. Build frontend
npm run build

# 4. Start system
npm start
```

The system will start on:
- **Web Dashboard**: `http://localhost:5000`
- **TCP Socket Listener**: `127.0.0.1:8085`
- **UDP Datagram Listener**: `127.0.0.1:8086`
- **REST & WebSockets**: `http://localhost:5000/api` & `ws://localhost:5000/ws`
