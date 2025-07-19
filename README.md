# LoomCal 

LoomCal is a powerful, flexible event tracking platform that treats **everything as an event**. Whether it's learning progress, user activities, system events, or custom workflows, LoomCal provides Bots, APIs, SDKs, and integrations to capture, analyze, and act upon any trackable action.

## SDK Documentation

[**Partial SDK Documentation →**](/src/sdk/README.md)

## Bot

### Telegram Bot
Start a conversation with [`@LoomCalBot`](https://t.me/LoomCalBot) and manage your events on the go.

#### Documentation
[**Telegram Bot Documentation →**](/src/app//api//bots/telegram/_controller/lib/README.md)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **API**: REST

## Support

- 📧 Email: info@neploom.com
- 🐛 Issues: [GitHub Issues](https://github.com/Enfiniq/loomcal/issues)

## Contributors

- **Enfiniq (me)** —> SDK, API, Telegram Bot and APP development
- **AI** —> Helped with README generation, copy writing, adding comments, regex, constants, parsing logic, scanning logic, message texts, and optimising the logic for flag detection.

## Acknowledgments

- Inspired by modern calendar applications
  
##  Architecture Overview

### 🤖 **Bots**
- **Telegram Bot**: Personal and group activity tracking ([Link](https://web.telegram.org/k/#@LoomCalBot))
  
### **API** - RESTful & Bulk Operations
- **RESTful Endpoints**: Standard CRUD operations for events and users
- **Bulk Operations**: High-performance batch processing via `/api/operations/bulk`
- **API Key Authentication**: Secure access control with rate limiting
- **PostgreSQL Backend**: Optimized stored procedures for complex queries

### **SDK** - TypeScript/JavaScript Client
- **Modern TypeScript SDK**: Type-safe client with intelligent API handling
- **Chainable Operations**: Fluent interface for complex workflows
- **React Components**: Ready-to-use UI components with hooks
- **Batch Processing**: Automatic optimization for multiple operations
- 

## ✨ Core Features

### 🎯 **Flexible Event Model**
- **Universal Events**:
- **Rich Metadata**:
- **User Relationships**:
  - `linkedUserId` system for external integrations
- **Time Tracking**:

### � **Enterprise Security**
- **API Key Management**: Secure authentication with scope control
- **CORS Protection**: Origin-based access control for browser requests
- **Rate Limiting**: Configurable limits to prevent abuse

### ⚡ **High Performance**
- **Bulk Operations**: Process thousands of events in single requests with automatic batching
- **Query Optimization**: 
  - MongoDB-style operators ($and, $or, $in, $exists, $regex)
- **Database Efficiency**: 
  - Optimized PostgreSQL stored procedures
  - Method Chaining support, bulk operations support

### � **Seamless Integrations**
- **Bot Ecosystem**: Telegram-platform presence for diverse workflows
- **SDK-First Design**: TypeScript SDK with React components
- **API Compatibility**: RESTful design with predictable endpoints

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun
- PostgreSQL database (local or hosted)
- Supabase account (recommended) or custom PostgreSQL setup

### Quick Installation

1. **Clone the repository:**
```bash
git clone https://github.com/Enfiniq/loomcal.git
cd loomcal
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# ================================
# LoomCal Environment Configuration
# ================================


# LoomCal API configuration
NEXT_PUBLIC_LOOMCAL_BASE_URL=https://loomcal.neploom.com
LOOMCAL_API_KEY=lc_your_loomcal_api_key_here

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# NextAuth.js secret for session encryption (generate: openssl rand -base64 32)
NEXTAUTH_SECRET=your_nextauth_secret_here

# Your application URL (production URL or http://localhost:3000 for development)
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_SECRET=your_admin_secret_here

# Base URL for API calls and redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Allowed origins for CORS (comma-separated, no spaces)
ALLOWED_ORIGINS=http://localhost:3000

# Secret key for API key encryption/decryption (generate: openssl rand -hex 32)
API_KEY_SECRET=your_api_key_encryption_secret_here
```

4. **Set up the database:**
```bash
npm run db:setup
```

5. **Start the development server:**
```bash
npm run dev
```

6. **Open [http://localhost:3000](http://localhost:3000)** to see your LoomCal instance running!

## 📦 SDK Integration

Install the LoomCal SDK in your project:

```bash
npm install @neploom/loomcal
```

### Basic Usage

```typescript
import { LoomCal } from '@neploom/loomcal';

const client = new LoomCal({
  apiKey: 'lc_your_api_key_here',
  baseUrl: 'https://your-loomcal-instance.com'
});

// Basic event tracking
await client.createEvents({
  event: {
    title: 'User Completed Onboarding',
    type: 'milestone',
    user: { identifier: 'user123@example.com' },
    customData: {
      feature: 'onboarding',
      completionTime: 180, // seconds
      steps: ['welcome', 'profile', 'preferences']
    }
  }
}).execute();

// Advanced querying with MongoDB-style operators
const events = await client.getEvents({
  target: {
    $and: [
      { type: 'milestone' },
      { 'customData.feature': 'onboarding' },
      { createdAt: { $gte: '2024-01-01T00:00:00Z' } },
      { 'customData.completionTime': { $lte: 300 } }
    ]
  },
  options: { 
    limit: 50, 
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
}).execute();

// Method chaining for complex operations
const [newUser, userEvents] = await client
  .createUsers({
    user: {
      identifier: 'user123',
      email: 'user@example.com',
      customData: { role: 'admin' }
    }
  })
  .getEvents({
    target: { 'user.identifier': 'user123' },
    options: { limit: 10 }
  })
  .execute();
```

## 🧩 Component Usage

LoomCal provides reusable components for integration:

```jsx
import { LoomCalProvider } from '@neploom/loomcal';

function Layout({ children }) {
  return (
    <div>
      <LoomCalProvider config={{
        apiKey: process.env.LOOMCAL_API_KEY!,
        baseUrl: process.env.NEXT_PUBLIC_LOOMCAL_BASE_URL!
      }}>
        {children}
      </LoomCalProvider>
    </div>
  );
}
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](/src/sdk/LICENSE) file for details.

---

**Made with ❤️ by the LoomCal & NepLoom Team**
