# LifeMap - Goal-Based AI Insurance Simulator

This repository contains the LifeMap application, which consists of a Python FastAPI backend and a React (Vite) frontend.

## Getting Started

When cloning this project from GitHub, you will need to set up the necessary environment files (`.env`) manually, as they are not committed to Git for security reasons.

Follow these step-by-step instructions to get both the backend and frontend running on your local machine.

### 1. Clone the Repository
```bash
git clone https://github.com/ThilokT/Goal-Based_AI_Insurance_Simulator.git
cd Goal-Based_AI_Insurance_Simulator-main
```

### 2. Backend Setup
The backend powers the AI chat, the database operations, and the simulation logic.

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```
2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   
   # On Windows:
   .\venv\Scripts\activate
   
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Set up Environment Variables**:
   Create a new file named `.env` inside the `backend` folder. Add the following keys and replace the placeholder values with your actual API credentials:
   ```env
   # AI API Keys
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Supabase Credentials
   SUPABASE_URL=your_supabase_project_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_KEY=your_supabase_service_key_here
   ```
5. **Run the backend server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend will now be running at `http://localhost:8000`*


### 3. Frontend Setup
The frontend is the user interface where you interact with the AI Advisor and Simulator.

1. **Open a new terminal window**, and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. **Install Node dependencies**:
   ```bash
   npm install
   ```
3. **Set up Environment Variables**:
   Create a new file named `.env` inside the `frontend` folder and tell the frontend where to find the backend:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```
4. **Run the frontend development server**:
   ```bash
   npm run dev
   ```
   *The frontend will now be running at `http://localhost:5173`*

### 4. Access the Application
Once both the frontend and backend servers are running, open your web browser and go to:
**http://localhost:5173**

You are all set to use the LifeMap simulator!

### 5. Demo Access
To quickly test the application, you can use the following demo credentials:
- **Email:** `demo1@gmail.com`
- **Password:** `thilok`
