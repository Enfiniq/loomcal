# 🗓️ LoomCal SDK

[![npm version](https://badge.fury.io/js/%40neploom%2Floomcal.svg)](https://badge.fury.io/js/%40neploom%2Floomcal)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Modern TypeScript SDK for LoomCal - the universal event tracking platform that treats everything as an event.**

## 🤔 Why LoomCal Exists

### The Problem
Modern applications need to track user activities, system events, learning progress, and custom workflows. Traditional solutions are either:
- **Too rigid**: Limited to specific use cases like calendars or analytics
- **Too complex**: Require extensive setup and configuration
- **Too fragmented**: Different tools for different types of events

### The LoomCal Solution
LoomCal treats **everything as an event**. Whether you're building:
- 📚 **Educational platforms** tracking learning progress
- 💪 **Fitness apps** monitoring workout completions  
- 🎮 **Gaming platforms** recording achievements
- 📊 **SaaS applications** analyzing user interactions
- 🏢 **Enterprise systems** auditing business processes

**Every action becomes structured, queryable data** that you can analyze, visualize, and act upon.

## 🎯 Core Use Cases

### 📖 Learning Management Systems
```typescript
// Track course progress
await client.createEvents({
  event: {
    title: "Completed: Introduction to React Hooks",
    type: "course-completion",
    customData: {
      courseId: "react-hooks-101",
      module: "useState and useEffect",
      score: 95,
      timeSpent: 1800 // 30 minutes
    },
    user: { identifier: "student123" }
  }
}).execute();

// Query learning analytics
const progress = await client.getEvents({
  target: {
    "customData.courseId": "react-hooks-101",
    type: "course-completion"
  },
  options: { sortBy: "createdAt", sortOrder: "desc" }
}).execute();
```

### 🏃‍♂️ Fitness & Health Tracking
```typescript
// Log workout sessions
await client.createEvents([
  {
    event: {
      title: "Morning Cardio Session",
      type: "workout",
      startTime: "2024-01-15T07:00:00Z",
      endTime: "2024-01-15T07:45:00Z",
      customData: {
        exerciseType: "running",
        distance: 5.2,
        calories: 420,
        heartRate: { avg: 145, max: 165 }
      },
      user: { identifier: "athlete@example.com" }
    }
  }
]).execute();

// Track weekly fitness goals
const weeklyWorkouts = await client.getEvents({
  target: {
    type: "workout",
    createdAt: { $gte: "2024-01-15T00:00:00Z" }
  }
}).execute();
```

### 🎮 Gaming & Achievements
```typescript
// Record game achievements
await client.createEvents({
  event: {
    title: "Level 50 Reached",
    type: "achievement",
    customData: {
      gameId: "rpg-adventure",
      achievementId: "level-50",
      xpGained: 10000,
      rarity: "epic"
    },
    user: { identifier: "gamer_pro_2024" }
  }
}).execute();
```

### 📊 Business Process Tracking
```typescript
// Track customer interactions
await client.createEvents({
  event: {
    title: "Support Ticket Resolved",
    type: "customer-support",
    customData: {
      ticketId: "TK-2024-001",
      category: "technical",
      resolution: "password-reset",
      satisfaction: 5,
      responseTime: 120 // minutes
    },
    user: { identifier: "support@company.com" }
  }
}).execute();
```

---

## 🚀 Quick Start

### Installation

```bash
npm install @neploom/loomcal
# or
yarn add @neploom/loomcal
# or
pnpm add @neploom/loomcal
```

### Basic Usage

```typescript
import { LoomCal } from '@neploom/loomcal';

// Initialize client with your API key
const client = new LoomCal({
  apiKey: 'lc_your_api_key_here',
  baseUrl: 'https://your-loomcal-instance.com', // Optional: defaults to production
  debug: true // Optional: enable request logging
});

// Create a single event with .execute()
const event = await client.createEvents({
  event: {
    title: 'User Completed Onboarding',
    type: 'onboarding-completion',
    customData: { step: 'welcome-tour', completionRate: 100 },
    user: { identifier: 'user123@example.com' }
  }
}).execute(); // Single operation execution

// Create multiple events in batch with a single API call
const batchResult = await client.createEvents([
  { event: { title: 'Event 1', user: { identifier: 'user1' } } },
  { event: { title: 'Event 2', user: { identifier: 'user2' } } }
]).execute(); // Will execute both operations in one request

console.log('Event created:', event);
console.log('Batch result:', batchResult);
```

---

## 🏗️ Self-Hosting Guide

### Requirements

1. **API Route Setup**
   - Create a POST endpoint at `/api/operations/bulk`
   - This endpoint must be running whenever the SDK is in use
   - Handles all SDK operations (events, users, etc.)

2. **Database Setup**
   - Deploy the provided SQL schema to your Supabase project
   - Deploy stored procedures for efficient data operations
   - Required Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_role_key
     ```

3. **SDK Configuration**
   ```typescript
   const client = new LoomCal({
     apiKey: 'your_api_key',
     baseUrl: 'https://your-domain.com', // Points to your /api/operations/bulk endpoint
   });
   ```

**Note:** Ensure your `/api/operations/bulk` endpoint is always available as it's critical for SDK functionality.

---

## ⚙️ Configuration

### LoomCalConfig Interface

```typescript
interface LoomCalConfig {
  apiKey: string;           // Required: Your API key from LoomCal dashboard
  baseUrl?: string;         // Optional: Custom API endpoint
  timeout?: number;         // Optional: Request timeout (default: 30000ms)
  retries?: number;         // Optional: Retry attempts (default: 3)
  debug?: boolean;          // Optional: Enable debug logging (default: false)
}
```

### Advanced Configuration

```typescript
const client = new LoomCal({
  apiKey: process.env.LOOMCAL_API_KEY!,
  baseUrl: 'https://api.loomcal.com',
  timeout: 15000,           // 15 second timeout
  retries: 5,               // Retry failed requests 5 times
  debug: process.env.NODE_ENV === 'development',
});
```

---

## 📖 Complete API Reference

### 🎯 Event Operations

#### `createEvents(eventData, options?)`

Creates one or more events with intelligent deduplication and batch processing.

**Single Event Creation:**
```typescript
const result = await client.createEvents({
  event: {
    title: string;                    // Required: Event title
    description?: string;             // Optional: Event description
    startTime?: string | Date;        // Optional: Event start time (ISO string or Date)
    endTime?: string | Date;          // Optional: Event end time
    type?: string;                    // Optional: Event type/category
    color?: string;                   // Optional: Display color (hex)
    resource?: string;                // Optional: Associated URL/resource
    customData?: Record<string, any>; // Optional: Custom metadata
    user: {                          // Required: User information
      identifier: string;             // Required: Unique user identifier
      email?: string;                 // Optional: User email
      name?: string;                  // Optional: User name
      linkedUserId?: string;          // Optional: Link to existing user ID
      customData?: Record<string, any>; // Optional: User metadata
    }
  },
  options?: {
    isSigned?: {                      // Optional: User verification settings
      check: boolean;                 // Check if user is verified
      createUser?: boolean;           // Create user if not exists
      strict?: boolean;               // Checks linked user ID
    };
    savingRule?: {                    // Optional: Deduplication rules
      timeBetweenDuplicates?: number; // Time constraint in seconds
      uniquenessFields?: string[] | UniquenessCriteria; // Fields to check
      onDuplicate?: 'update' | 'ignore' | 'reject'; // Action on duplicate
    };
  }
}).execute();
```

**Batch Event Creation:**
```typescript
const results = await client.createEvents([
  { event: { /* event 1 */ }, options: { /* event 1 options */ } },
  { event: { /* event 2 */ }, options: { /* event 2 options */ } }
], {
  stopOnError?: boolean;              // Stop processing on first error
  defaultOptions?: {
    isSigned?: {                      // Optional: User verification settings
      check: boolean;                 // Check if user is verified
      createUser?: boolean;           // Create user if not exists
      strict?: boolean;               // Checks linked user ID
    };
    savingRule?: {                    // Optional: Deduplication rules
      timeBetweenDuplicates?: number; // Time constraint in seconds
      uniquenessFields?: string[] | UniquenessCriteria; // Fields to check
      onDuplicate?: 'update' | 'ignore' | 'reject'; // Action on duplicate
    };
  };
}).execute();

```

#### `getEvents(criteria?, options?)`

Retrieves events with powerful MongoDB-style query operators.

```typescript
// Simple query
const events = await client.getEvents({
  target: {
    type: "course-completion",
    "customData.courseId": "react-101"
  },
  options: {
    limit: 50,
    sortBy: "createdAt",
    sortOrder: "desc"
  }
}).execute();

// Complex query with operators
const filteredEvents = await client.getEvents({
  target: {
    $and: [
      { type: { $in: ["workout", "run", "cycle"] } },
      { "customData.distance": { $gte: 5 } },
      { createdAt: { $gte: "2024-01-01T00:00:00Z" } }
    ]
  },
  options: { limit: 100 }
}).execute();

// Available operators: $and, $or, $not, $in, $nin, $exists, $gte, $lte, $gt, $lt, $regex
```

#### `updateEvents(criteria, updates, options?)`

Updates multiple events matching the criteria.

```typescript
const updated = await client.updateEvents({
  target: {
    type: "incomplete-course",
    "customData.courseId": "react-101"
  },
  updates: {
    type: "completed-course",
    customData: {
      courseId: "react-101",
      completionDate: new Date().toISOString(),
      status: "completed"
    }
  },
  options: { limit: 100 }
}).execute();
```

#### `deleteEvents(criteria, options?)`

Deletes events matching the criteria.

```typescript
// Delete test events
const deleted = await client.deleteEvents({
  target: {
    type: "test-event",
    "customData.temporary": true
  },
  options: { limit: 50 } // Safety limit
}).execute();
```

### 👥 User Operations

#### `createUsers(userData, options?)`

Creates one or more users with optional linkedUserId support.

```typescript
// Single user
const user = await client.createUsers({
  user: {
    identifier: "student123",
    email: "student@university.edu",
    name: "Alex Student",
    linkedUserId: "uuid-1234-5678", // Optional: link to external user ID
    customData: {
      school: "Computer Science",
      year: 2024,
      preferences: { theme: "dark", notifications: true }
    }
  },
  options: { isSigned: false }
}).execute();

// Batch user creation
const users = await client.createUsers([
  { user: { identifier: "user1", email: "user1@example.com" } },
  { user: { identifier: "user2", email: "user2@example.com" } }
]).execute();
]);
```

#### `getUsers(criteria?, options?)`

Retrieves users with advanced filtering.

```typescript
// Find users by department
const engineeringUsers = await client.getUsers({
  target: {
    "customData.department": "engineering",
    linkedUserId: { $exists: true }
  },
  options: { sortBy: "name", limit: 50 }
}).execute();

// Complex user queries
const activeUsers = await client.getUsers({
  target: {
    $and: [
      { "customData.status": "active" },
      { createdAt: { $gte: "2024-01-01T00:00:00Z" } },
      { $or: [
        { "customData.role": "admin" },
        { "customData.permissions": { $in: ["read", "write"] } }
      ]}
    ]
  }
}).execute();
```

#### `updateUsers(criteria, updates, options?)`

Updates multiple users matching the criteria.

```typescript
const promoted = await client.updateUsers({
  target: {
    "customData.role": "developer",
    "customData.performanceScore": { $gte: 90 }
  },
  updates: {
    customData: {
      role: "senior-developer",
      promotionDate: new Date().toISOString(),
      salary: { increased: true }
    }
  },
  options: { limit: 20 }
}).execute();
```

#### `deleteUsers(criteria, options?)`

Deletes users matching the criteria.

```typescript
// Clean up test users
const deleted = await client.deleteUsers({
  target: {
    identifier: { $regex: "^test_user_.*" },
    "customData.temporary": true
  },
  options: { limit: 100 }
}).execute();
```

---

## 🎛️ Advanced Query Operators

LoomCal supports MongoDB-style query operators for powerful data filtering:

```typescript
// Comparison operators
{ age: { $gt: 18, $lte: 65 } }           // age > 18 AND age <= 65
{ score: { $gte: 80 } }                  // score >= 80
{ status: { $ne: "inactive" } }          // status != "inactive"

// Array operators  
{ tags: { $in: ["urgent", "important"] } }     // tags contains "urgent" OR "important"
{ categories: { $nin: ["spam", "test"] } }     // categories doesn't contain "spam" or "test"

// Existence and type
{ linkedUserId: { $exists: true } }      // linkedUserId field exists and is not null
{ optional: { $exists: false } }         // optional field doesn't exist or is null

// Pattern matching
{ email: { $regex: ".*@company\\.com$" } }     // email ends with @company.com

// Logical operators
{
  $and: [
    { type: "workout" },
    { "customData.duration": { $gte: 30 } }
  ]
}

{
  $or: [
    { priority: "high" },
    { "customData.urgent": true }
  ]
}

{
  $not: {
    status: "archived"
  }
}
```

---

## ⚡ Performance & Best Practices

### Batch Operations
Always prefer batch operations for multiple items:

```typescript
// ✅ Good: Single batch request
await client.createEvents([
  { event: { title: "Event 1", user: { identifier: "user1" } } },
  { event: { title: "Event 2", user: { identifier: "user2" } } },
  { event: { title: "Event 3", user: { identifier: "user3" } } }
]).execute();

// ❌ Avoid: Multiple individual requests
await client.createEvents({ event: { title: "Event 1", user: { identifier: "user1" } } }).execute();
await client.createEvents({ event: { title: "Event 2", user: { identifier: "user2" } } }).execute();
await client.createEvents({ event: { title: "Event 3", user: { identifier: "user3" } } }).execute();
```

### Query Optimization
Use specific queries and limits:

```typescript
// ✅ Good: Specific query with limit
const events = await client.getEvents({
  target: {
    type: "course-completion",
    createdAt: { $gte: "2024-01-01T00:00:00Z" }
  },
  options: { limit: 100, sortBy: "createdAt" }
}).execute();

// ❌ Avoid: Broad queries without limits
const allEvents = await client.getEvents(); // Could return thousands of records
```

---

## ⚛️ React Components

LoomCal includes React components and hooks for seamless integration:

### Context Provider

```tsx
import { LoomCalProvider } from '@neploom/loomcal';

function App() {
  return (
    <LoomCalProvider
      config={{
        apiKey: process.env.LOOMCAL_API_KEY!,
        baseUrl: process.env.NEXT_PUBLIC_LOOMCAL_BASE_URL!,
        debug: process.env.NODE_ENV === 'development'
      }}
    >
      <YourAppComponents />
    </LoomCalProvider>
  );
}
```

### Hooks for Event Management

```tsx
import { useLoomCal } from '@neploom/loomcal';

function EventTracker() {
  const { createEvents, getEvents, loading, error } = useLoomCal();
  
  const handleTrackAction = async (action: string) => {
    try {
      await createEvents({
        event: {
          title: `User ${action}`,
          type: 'user-interaction',
          customData: { action, timestamp: Date.now() },
          user: { identifier: 'current-user' }
        }
      }).execute();
    } catch (err) {
      console.error('Failed to track action:', err);
    }
  };

  return (
    <div>
      <button onClick={() => handleTrackAction('clicked-button')}>
        Track Click
      </button>
      {loading && <p>Tracking...</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

---

## ⛓️ Advanced Use Case: Method Chaining

LoomCal supports method chaining for complex operations, allowing you to combine multiple operations into a single execution:

```typescript
// Chain multiple operations
const results = await client
  .createEvents([
    { 
      event: { 
        title: 'User Registration',
        type: 'auth',
        user: { identifier: 'user123' }
      }
    }
  ])
  .getEvents({
    target: { 
      type: 'auth',
      'user.identifier': 'user123'
    }
  })
  .execute(); // Executes all operations in order

// Practical example: Track event and get user history
const history = await client
  .createEvents({
    event: {
      title: 'Purchase Complete',
      type: 'transaction',
      customData: { amount: 99.99 },
      user: { identifier: 'customer123' }
    }
  })
  .getEvents({
    target: {
      'user.identifier': 'customer123',
      type: 'transaction'
    },
    options: { 
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  })
  .execute();
```

This approach is particularly useful when you need to perform related operations in sequence while maintaining efficiency with a single API call.

---

## 🚀 Quick Dive: Real-World Example

Let's build a complete learning progress tracker:

```typescript
import { LoomCal } from '@neploom/loomcal';

class LearningTracker {
  private client: LoomCal;
  
  constructor(apiKey: string) {
    this.client = new LoomCal({
      apiKey,
      debug: process.env.NODE_ENV === 'development'
    });
  }

  // Track when a student starts a lesson
  async startLesson(studentId: string, courseId: string, lessonId: string) {
    return this.client.createEvents({
      event: {
        title: `Started Lesson: ${lessonId}`,
        type: 'lesson-start',
        startTime: new Date().toISOString(),
        customData: {
          courseId,
          lessonId,
          status: 'in-progress'
        },
        user: { identifier: studentId }
      },
      options: {
        savingRule: {
          timeBetweenDuplicates: 300, // 5 minutes cooldown
          uniquenessFields: ['user.identifier', 'customData.lessonId'],
          onDuplicate: 'update'
        }
      }
    }).execute();
  }

  // Track lesson completion with score
  async completeLesson(studentId: string, courseId: string, lessonId: string, score: number) {
    return this.client.createEvents({
      event: {
        title: `Completed Lesson: ${lessonId}`,
        type: 'lesson-completion',
        endTime: new Date().toISOString(),
        customData: {
          courseId,
          lessonId,
          score,
          status: 'completed',
          grade: score >= 80 ? 'pass' : 'review'
        },
        user: { identifier: studentId }
      }
    }).execute();
  }

  // Get student progress for a course
  async getCourseProgress(studentId: string, courseId: string) {
    const [completed, started] = await Promise.all([
      // Get completed lessons
      this.client.getEvents({
        target: {
          type: 'lesson-completion',
          'user.identifier': studentId,
          'customData.courseId': courseId
        },
        options: { sortBy: 'createdAt', sortOrder: 'desc' }
      }).execute(),
      
      // Get all started lessons
      this.client.getEvents({
        target: {
          type: 'lesson-start',
          'user.identifier': studentId,
          'customData.courseId': courseId
        }
      }).execute()
    ]);

    return {
      completedLessons: completed.operations?.length || 0,
      startedLessons: started.operations?.length || 0,
      averageScore: this.calculateAverageScore(completed),
      recentActivity: completed.operations?.slice(0, 5) || []
    };
  }

  // Analytics: Get top performing students
  async getTopStudents(courseId: string, limit = 10) {
    const completions = await this.client.getEvents({
      target: {
        type: 'lesson-completion',
        'customData.courseId': courseId,
        'customData.score': { $gte: 70 }
      },
      options: { 
        limit: 1000,
        sortBy: 'customData.score',
        sortOrder: 'desc'
      }
    }).execute();

    // Group by student and calculate metrics
    const studentMetrics = this.groupAndAnalyze(completions);
    return studentMetrics.slice(0, limit);
  }

  // Batch update: Mark lessons as reviewed
  async markLessonsReviewed(courseId: string, lessonIds: string[]) {
    return this.client.updateEvents({
      target: {
        type: 'lesson-completion',
        'customData.courseId': courseId,
        'customData.lessonId': { $in: lessonIds },
        'customData.grade': 'review'
      },
      updates: {
        customData: {
          grade: 'reviewed',
          reviewedAt: new Date().toISOString(),
          status: 'completed'
        }
      },
      options: { limit: 100 }
    }).execute();
  }

  private calculateAverageScore(events: any[]): number {
    if (!events.length) return 0;
    const scores = events
      .map(e => e.customData?.score)
      .filter(score => typeof score === 'number');
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private groupAndAnalyze(events: any[]) {
    // Implementation for grouping events by student and calculating metrics
    // This would analyze completion rates, average scores, etc.
    return [];
  }
}

// Usage
const tracker = new LearningTracker('lc_your_api_key');

// Track a student's journey
await tracker.startLesson('student123', 'react-course', 'hooks-intro');
await tracker.completeLesson('student123', 'react-course', 'hooks-intro', 95);

// Get analytics
const progress = await tracker.getCourseProgress('student123', 'react-course');
const topStudents = await tracker.getTopStudents('react-course');

console.log('Student progress:', progress);
console.log('Top performers:', topStudents);
```

---

## 🦾 Advanced Edge Case: Deferred Event Tracking (Recommended Pattern)

A powerful pattern is to create a shared SDK client in a file like `loomcal/userEventTracking.ts`:

```typescript
// loomcal/userEventTracking.ts
import { LoomCal } from '@neploom/loomcal';

export const client = new LoomCal({
  apiKey: 'lc_your_api_key_here',
  baseUrl: 'https://your-loomcal-instance.com',
});
```

Then, throughout your app, track events as the user interacts (no need to await), and no need to execute immediately:

```typescript
client.createEvents({
  event: {
    title: 'Event 1',
    user: { identifier: 'User_123' },
    // ...other fields
  }
});
```

As the user continues to interact, queue up more events. When the user is about to leave the page (e.g., in a `beforeunload` handler):

```typescript
await client.execute(); // Sends all queued events in a single request
```

This pattern enables batching and reduces network requests, making your event tracking highly efficient.

---

## 📚 Additional Resources

- **[API Documentation](https://docs.loomcal.neploom.com)** - Complete API reference
- **[Dashboard](https://dashboard.loomcal.neploom.com)** - Manage API keys and view analytics
- **[Community Discord](https://discord.gg/loomcal)** - Get help and share ideas

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by the LoomCal & NepLoom Team**