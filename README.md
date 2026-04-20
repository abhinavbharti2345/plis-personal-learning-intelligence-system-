# 🧠 Synaptiq - Personal Learning Intelligence System

> **A decision-driven AI-powered learning platform that helps students organize knowledge, track progress, and make smarter learning decisions.**

![React](https://img.shields.io/badge/React-18.2-blue?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.0-purple?style=flat-square&logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-10.7-orange?style=flat-square&logo=firebase)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 🎯 Overview

**Synaptiq** transforms how students learn by combining intelligent analysis, structured knowledge organization, and real-time collaboration. Unlike traditional note-taking apps, Synaptiq provides actionable insights and guidance on what to learn next.

### The Problem
Students struggle with:
- Unstructured, scattered learning approaches
- No clear visibility into actual progress
- Difficulty identifying knowledge gaps
- Ineffective study planning and time management
- Isolated learning without collaboration

### The Solution
Synaptiq provides a unified ecosystem that:
- ✅ **Organizes** knowledge into hierarchical skill trees
- ✅ **Visualizes** learning as an interactive brain graph
- ✅ **Analyzes** progress and identifies weaknesses
- ✅ **Generates** personalized AI study plans
- ✅ **Facilitates** real-time collaboration with peers

---

## ✨ Core Features

### 📊 Dashboard
The central hub for learning insights and planning:
- **Study Analytics**: Track time spent, topics studied, and completion rates
- **AI Study Coach**: Generate personalized study plans based on your learning patterns
- **Quick Stats**: Overview of progress, active topics, and upcoming goals
- **Activity Feed**: Recent study sessions and achievements

### 🌳 Skill Tree
Organize your learning in a hierarchical structure:
- **Topic Hierarchy**: Create parent-child relationships between topics (e.g., Math → Algebra → Linear Equations)
- **Dynamic Topic Creation**: Add topics on-the-fly with customizable properties
- **Progress Tracking**: Visual indicators showing mastery levels
- **Prerequisites**: Define topic dependencies and recommended learning order
- **Visual Navigation**: Click and explore topics effortlessly

### 🧠 Brain View
Visualize your knowledge as an interconnected brain graph:
- **Interactive Graph Visualization**: See all topics and their relationships at a glance
- **Smooth Curved Connections**: Beautiful, physics-based animations showing topic links
- **Tree-Based Relationships**: Automatic layout based on your skill hierarchy
- **Pan & Zoom**: Navigate complex knowledge networks smoothly
- **Click to Navigate**: Jump to any topic directly from the graph

### 📝 Notes System
Structured knowledge management per topic:
- **Topic-Based Organization**: Notes automatically linked to skill tree topics
- **Rich Text Editing**: Format notes with markdown support
- **File Uploads**: Attach study materials, images, and documents
- **Search & Filter**: Find notes instantly across all topics
- **Tagging System**: Add custom tags for better organization and discovery

### 🌟 Reflection System
Daily journaling with AI-powered insights:
- **Daily Reflections**: Write about your learning, challenges, and breakthroughs
- **AI Analysis**: Get intelligent insights on:
  - Study habits and patterns
  - Common distractions
  - Areas for improvement
  - Motivation and engagement trends
- **Insights Dashboard**: View analyzed patterns over time
- **Action Recommendations**: AI-suggested optimizations for your study routine

### 🤝 Discussion & Collaboration
Learn together with real-time collaboration:
- **Friend System**: Connect with classmates and study buddies
- **Real-Time Chat**: Instant messaging with your learning community
- **Collaborative Whiteboard**: Draw, sketch, and brainstorm together using Excalidraw
- **Shared Notes**: Collaborate on topics and study materials
- **Live Presence**: See who's online and available to study

---

## 🤖 AI Features

Synaptiq leverages cutting-edge AI to enhance learning:

### AI Study Plan Generation
- Analyzes your current knowledge and goals
- Generates optimized, personalized study schedules
- Adapts recommendations based on your pace and performance
- Suggests focus areas based on identified weaknesses

### Intelligent Reflection Analysis
- Processes daily journal entries for patterns and insights
- Identifies productivity blockers and distractions
- Recommends study environment improvements
- Tracks emotional and motivational trends

### Smart Prompts & Suggestions
- Context-aware prompts for better note-taking
- Suggested related topics based on your studies
- Discussion starter questions for collaboration
- Study reminders tailored to your needs

### Cost-Optimized AI APIs
- **Groq** for fast, efficient text generation
- **Google Gemini** for advanced analysis and reasoning
- Rate limiting and caching to minimize costs
- Fallback mechanisms for reliability

---

## ⚙️ Tech Stack

### Frontend
- **React 18.2** - Modern UI library
- **Vite 5.0** - Lightning-fast build tool
- **Tailwind CSS 3.4** - Utility-first styling
- **React Router 6.21** - Client-side routing
- **React Icons 5.0** - Beautiful icon library

### Visualization & Drawing
- **React Flow 11.10** - Interactive graph for Brain View
- **Excalidraw 0.18** - Collaborative whiteboard
- **Tldraw 4.5** - Advanced drawing capabilities
- **Fabric.js 7.2** - Canvas manipulation library
- **Recharts 2.10** - Beautiful chart components

### Backend & Database
- **Firebase 10.7**
  - Authentication (Email, Google, GitHub)
  - Firestore (NoSQL database)
  - Realtime Database (for live collaboration)
  - Cloud Storage (file uploads)
- **Cloud Functions** (Node.js backend)

### Real-Time Collaboration
- **Liveblocks 3.18** - Real-time presence and synchronization
- **WebSockets** - Live chat and collaborative features

### AI & APIs
- **Groq** - Fast AI text generation
- **Google Gemini** - Advanced analysis

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm (or yarn)
- Firebase account
- Groq API key (free tier available)
- Optionally: Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/synaptiq.git
   cd synaptiq
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # AI APIs
   VITE_GROQ_API_KEY=your_groq_api_key
   VITE_GEMINI_API_KEY=your_gemini_api_key

   # Liveblocks (for collaboration)
   VITE_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

5. **Deploy to Firebase** (optional)
   ```bash
   npm run build
   firebase deploy
   ```

---

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSyD...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `my-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `my-project-123` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `my-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc123` |
| `VITE_GROQ_API_KEY` | Groq AI API key | `gsk_wNR...` |
| `VITE_GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `VITE_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks public key (for collaboration) | `pk_prod_...` |

---

## 📂 Project Structure

```
synaptiq/
├── src/
│   ├── components/
│   │   ├── layout/              # Layout components (Sidebar, TopBar, etc.)
│   │   ├── planner/             # Planner components (Daily, Weekly, Monthly)
│   │   ├── topic/               # Topic components (TopicForm, TopicNode)
│   │   ├── whiteboard/          # Whiteboard components (Canvas, Toolbar)
│   │   ├── ui/                  # Reusable UI components (Modal, Card, etc.)
│   │   └── Whiteboard.jsx       # Main whiteboard component
│   │
│   ├── pages/
│   │   ├── DashboardPage.jsx    # Main dashboard with analytics
│   │   ├── BrainViewPage.jsx    # Knowledge graph visualization
│   │   ├── SkillTreePage.jsx    # Topic hierarchy view
│   │   ├── NotesPage.jsx        # Notes management
│   │   ├── ReflectionPage.jsx   # Daily reflections
│   │   ├── DiscussionPage.jsx   # Chat & collaboration
│   │   ├── PlannerPage.jsx      # Study planning
│   │   ├── ProfilePage.jsx      # User profile
│   │   ├── LoginPage.jsx        # Authentication
│   │   └── FriendsPage.jsx      # Friend management
│   │
│   ├── services/
│   │   ├── firebase.js          # Firebase configuration
│   │   ├── chatService.js       # Chat functionality
│   │   ├── aiService.js         # AI integration
│   │   ├── topicService.js      # Topic management
│   │   ├── noteService.js       # Notes management
│   │   ├── activityService.js   # Activity tracking
│   │   ├── plannerService.js    # Study planning
│   │   ├── reflectionService.js # Reflection analysis
│   │   ├── whiteboardService.js # Whiteboard sync
│   │   └── ai/                  # AI service modules
│   │       ├── aiClient.js
│   │       ├── prompts.js
│   │       └── index.js
│   │
│   ├── hooks/
│   │   ├── useCanvas.js         # Canvas drawing logic
│   │   ├── useCollaboration.js  # Real-time sync
│   │   ├── useDrawing.js        # Drawing utilities
│   │   └── usePanZoom.js        # Pan/zoom controls
│   │
│   ├── context/
│   │   ├── AuthContext.jsx      # Authentication state
│   │   ├── TopicContext.jsx     # Topic management state
│   │   ├── PlannerContext.jsx   # Planner state
│   │   ├── ReflectionContext.jsx # Reflection state
│   │   └── ThemeContext.jsx     # Theme management
│   │
│   ├── utils/
│   │   ├── clarityEngine.js     # Core analysis logic
│   │   ├── dateUtils.js         # Date utilities
│   │   ├── keywordDetector.js   # Text analysis
│   │   ├── drawUtils.js         # Drawing helpers
│   │   └── mathUtils.js         # Math calculations
│   │
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
│
├── functions/                   # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.js             # Function entry points
│   │   ├── groqService.js       # Groq API integration
│   │   ├── cacheService.js      # Response caching
│   │   ├── rateLimit.js         # Rate limiting
│   │   └── prompts.js           # AI prompt templates
│   └── package.json
│
├── public/                      # Static assets
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS config
├── postcss.config.js            # PostCSS config
├── firebase.json                # Firebase config
├── firestore.rules              # Firestore security rules
├── storage.rules                # Storage security rules
├── package.json                 # Dependencies
└── README.md                    # This file
```

---

## 📊 Architecture Overview

### Three-Pillar System

```
┌─────────────────────────────────────────┐
│   Personal Learning Intelligence        │
└─────────────────────────────────────────┘
           ↓          ↓          ↓
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Brain   │ │  Clarity │ │ Collab   │
    │  Engine  │ │  Engine  │ │  Engine  │
    └──────────┘ └──────────┘ └──────────┘
        ↓            ↓            ↓
    [Knowledge]  [Analytics]  [Friends]
    [Topics]     [Plans]      [Chat]
    [Notes]      [Insights]   [Whiteboard]
```

---

## 🧭 Key Workflows

### 1. Getting Started
1. Sign up with email or OAuth
2. Create your first topic
3. Set learning goals
4. Start taking notes

### 2. Study Planning
1. Dashboard shows AI-recommended focus areas
2. Generate personalized study plan
3. Plan study sessions in the Planner
4. Track time spent on each topic

### 3. Reflection & Insights
1. Write daily reflections
2. AI analyzes patterns and provides insights
3. Review recommendations
4. Adjust study approach accordingly

### 4. Collaboration
1. Add friends to your learning network
2. Chat in real-time
3. Collaborate on whiteboard
4. Share and discuss topics

---

## 🚀 Future Roadmap

### Phase 2: Advanced Features
- 🎯 AI-powered topic recommendations
- 📱 Mobile app (React Native)
- 🔄 Smart revision system with spaced repetition
- 📈 Advanced analytics and trend analysis
- 🎨 Obsidian-like Brain View with custom styling
- 🌐 Multi-language support
- 🎓 Teacher/classroom features

### Phase 3: Ecosystem
- 🤖 AI tutoring with real-time feedback
- 📚 Content library integration
- 🏆 Gamification and achievement system
- 👥 Community features and study groups
- 📊 Integrated assessment tools
- 🔗 Third-party integrations (Notion, Google Drive, etc.)

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and commit (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and patterns
- Write clear commit messages
- Test your changes thoroughly
- Update documentation as needed
- Keep components modular and reusable

### Reporting Issues
- Use clear, descriptive titles
- Provide steps to reproduce
- Include screenshots if applicable
- Mention your environment (OS, browser, Node version)

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support & Community

- **Questions?** Open an issue on GitHub
- **Want to collaborate?** Reach out on Discord/Twitter
- **Found a bug?** Report it with details and steps to reproduce
- **Have ideas?** Submit feature requests on the Issues tab

---

## 🙏 Acknowledgments

- **React** and **Vite** communities for excellent tools
- **Firebase** for scalable backend infrastructure
- **Excalidraw** and **Tldraw** for whiteboarding capabilities
- **React Flow** for graph visualization
- All contributors and early users for feedback and inspiration

---

## 📧 Contact

- **Email**: abhinavbharti2345@gmail.com
- **Linkedin**: [@abhinav-bharti](https://www.linkedin.com/in/abhinav-bharti-860507368/)
- **GitHub**: [@abhinavbharti2345 ](https://github.com/abhinavbharti2345)

---

<div align="center">

**Made with ❤️ by the Synaptiq team**

[Star us on GitHub](https://github.com/yourusername/synaptiq) ⭐

</div>
