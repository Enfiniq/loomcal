# �️ LoomCal - Modern Event Tracking Platform

LoomCal is a powerful, flexible event tracking platform that treats **everything as an event**. Whether it's learning progress, user activities, system events, or custom workflows, LoomCal provides comprehensive APIs, SDKs, and integrations to capture, analyze, and act upon any trackable action.

## 🏗️ Architecture Overview

LoomCal is built with a modular, scalable architecture designed for modern applications:

### 📱 **App** - Web Application & Dashboard
- **Admin Dashboard**: Manage organizations, API keys, and view analytics
- **User Authentication**: Secure sign-in/sign-up with NextAuth.js
- **Real-time Analytics**: Live event tracking and visualization
- **Organization Management**: Multi-tenant architecture with role-based access

### 🔌 **API** - RESTful & Bulk Operations
- **RESTful Endpoints**: Standard CRUD operations for events and users
- **Bulk Operations**: High-performance batch processing via `/api/operations/bulk`
- **API Key Authentication**: Secure access control with rate limiting
- **PostgreSQL Backend**: Optimized stored procedures for complex queries

### � **SDK** - TypeScript/JavaScript Client
- **Modern TypeScript SDK**: Type-safe client with intelligent API handling
- **Chainable Operations**: Fluent interface for complex workflows
- **React Components**: Ready-to-use UI components with hooks
- **Batch Processing**: Automatic optimization for multiple operations

### 🤖 **Bots** - Multi-Platform Integrations
- **Slack Bot**: Native workspace integration for team event tracking
- **Discord Bot**: Community and gaming event management
- **Telegram Bot**: Personal and group activity tracking
- **Signal Bot**: Privacy-focused secure communications

### 🧩 **Components** - Reusable UI Library
- **Calendar Views**: Multiple layout options (month, week, day, list)
- **Event Forms**: Configurable creation and editing interfaces
- **Analytics Widgets**: Charts, graphs, and data visualization
- **Theme System**: Customizable design tokens and styling

## ✨ Core Features

### 🎯 **Flexible Event Model**
- **Universal Events**: Track any action, commitment, or activity
- **Rich Metadata**: Custom fields, resources, and contextual data
- **User Relationships**: Link events to users with `linkedUserId` support
- **Time Tracking**: Precise start/end times with timezone support

### � **Enterprise Security**
- **API Key Management**: Secure authentication with scope control
- **CORS Protection**: Origin-based access control for browser requests
- **Rate Limiting**: Configurable limits to prevent abuse
- **Data Isolation**: Multi-tenant architecture with organization boundaries

### ⚡ **High Performance**
- **Bulk Operations**: Process thousands of events in single requests
- **Query Optimization**: MongoDB-style operators ($and, $or, $in, $exists)
- **Database Efficiency**: PostgreSQL stored procedures for complex operations
- **Intelligent Caching**: Optimized data retrieval and updates

### � **Seamless Integrations**
- **SDK-First Design**: TypeScript SDK with React components
- **Webhook Support**: Real-time notifications for event changes
- **Bot Ecosystem**: Multi-platform presence for diverse workflows
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
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_SECRET=your_admin_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# LoomCal Configuration
ALLOWED_ORIGINS=http://localhost:3000
API_KEY_SECRET=your_api_key_encryption_secret_here
NEXT_PUBLIC_LOOMCAL_BASE_URL=https://loomcal.neploom.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
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
npm install loomcal
```

### Basic Usage

```typescript
import { LoomCal } from 'loomcal';

const client = new LoomCal({
  apiKey: 'lc_your_api_key_here',
  baseUrl: 'https://your-loomcal-instance.com'
});

// Track any event
await client.createEvents({
  event: {
    title: 'User Completed Onboarding',
    type: 'milestone',
    user: { identifier: 'user123@example.com' }
  }
});

// Query events with powerful filters
const events = await client.getEvents({
  target: {
    type: 'milestone',
    createdAt: { $gte: '2024-01-01T00:00:00Z' }
  },
  options: { limit: 50, sortBy: 'createdAt' }
});
```

[📖 **Full SDK Documentation →**](https://docs.loomcal.neploom.com)

## 🤖 Bot Integration

### Slack Bot
Add the LoomCal bot to your Slack workspace for quick event management:
```
/loomcal create "Project Deadline" "Discuss project updates and next steps" -rt 0 30 -c #ff0000
```

### Telegram Bot
Start a conversation with `@LoomCalBot` and manage your events on the go.

### Discord Bot
Invite the LoomCal bot to your Discord server for team event coordination.

## 🛠️ Configuration

### Environment Variables

Create a `.env.local` file in your project root:

```bash
LOOMCAL_API_KEY=lc_your-api-key
NEXT_PUBLIC_LOOMCAL_BASE_URL=https://loomcal.neploom.com
# If you're self-hosting, set your Supabase URL and keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_hereNEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_SECRET=your_admin_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
API_KEY_SECRET=your_api_key_encryption_secret_here
```

### Self-Hosting

For self-hosting your LoomCal instance:

1. Set up your preferred database (PostgreSQL, MySQL, SQLite)
2. Configure your environment variables
3. Run database migrations:
```bash
npm run db:migrate
```
4. Start the application in production mode:
```bash
npm run build
npm start
```

## 🧩 Component Usage

LoomCal provides reusable components for integration:

```jsx
import { LoomCalProvider } from 'loomcal';

function Layout({ children }) {
  return (
    <div>
      <LoomCalProvider config={{
        apiKey: process.env.NEXT_PUBLIC_LOOMCAL_API_KEY!,
        baseUrl: process.env.NEXT_PUBLIC_LOOMCAL_BASE_URL!
      }}>
        {children}
      </LoomCalProvider>
    </div>
  );
}
```

## 🏗️ Architecture

LoomCal is built with modern technologies:

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **API**: REST
- **Authentication**: NextAuth.js

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 

## 🆘 Support

- 📧 Email: info@neploom.com
- 💬 Discord: [Join our community](https://discord.gg/loomcal)
- 📖 Documentation: [docs.loomcal.neploom.com](https://docs.loomcal.neploom.com)
- 🐛 Issues: [GitHub Issues](https://github.com/Enfiniq/loomcal/issues)


## 👥 Contributors

- **Enfiniq** — SDK, API, and APP development
- **AI** — Helped with README generation, copy writing, and adding comments

## 🙏 Acknowledgments

- Inspired by modern calendar applications

---

**Made with ❤️ by the LoomCal Team**