# ShortZ - AI Video Generator

ShortZ is an innovative AI-powered platform that transforms text prompts into engaging short-form videos optimized for TikTok and other social media platforms. Simply input your creative prompt, and let our AI generate compelling video content perfect for your social media needs.

## 🚀 Tech Stack

### Frontend (Client)
- Angular for a responsive and modern UI
- TailwindCSS for sleek styling
- TypeScript for type-safe development
- Angular CLI for development workflow

### Backend (Server)
- NestJS framework
- TypeScript
- Node.js
- Environment-based configuration for API keys and secrets

## ✨ Key Features

- **AI-Powered Video Generation**: Transform text prompts into engaging videos
- **Social Media Optimization**: Videos formatted perfectly for TikTok and other platforms
- **User-Friendly Interface**: Simple prompt input system
- **Quick Generation**: Fast video processing and delivery
- **Modern Design**: Clean, intuitive user experience
- **Secure API Integration**: Safe handling of AI model interactions

## 📁 Project Structure

```
├── client/          # Angular frontend application
└── server/          # NestJS backend application
```

## 🛠️ Setup and Installation

### Prerequisites
- Node.js (Latest LTS version)
- npm or yarn
- Git

### Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:4200`

### Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Configure your environment variables in the `.env` file:
   - Add your AI model API keys
   - Configure video processing settings
   - Set up other required environment variables
5. Start the development server:
   ```bash
   npm run start:dev
   ```
   The server will be available at `http://localhost:3000`

## 🎥 How It Works

1. **Input Your Prompt**: Write a descriptive prompt for your desired video content
2. **AI Processing**: Our system processes your prompt using advanced AI models
3. **Video Generation**: The AI generates a unique video based on your prompt
4. **Download & Share**: Download your video ready for social media posting

## 🔧 Development

- Hot-reload enabled for both frontend and backend development
- TailwindCSS configuration available in `client/tailwind.config.js`
- TypeScript support throughout the stack
- Comprehensive testing setup

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🔒 Security Note

Remember to keep your AI model API keys and sensitive credentials secure. Never commit them directly to the repository. 