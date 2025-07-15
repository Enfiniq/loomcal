# 🗓️ LoomCal SDK

[![npm version](https://badge.fury.io/js/loomcal.svg)](https://badge.fury.io/js/loomcal)
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
});

// Query learning analytics
const progress = await client.getEvents({
  target: {
    "customData.courseId": "react-hooks-101",
    type: "course-completion"
  },
  options: { sortBy: "createdAt", sortOrder: "desc" }
});
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
]);

// Track weekly fitness goals
const weeklyWorkouts = await client.getEvents({
  target: {
    type: "workout",
    createdAt: { $gte: "2024-01-15T00:00:00Z" }
  }
});
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
});
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
});
```

---

## 🚀 Quick Start

### Installation

```bash
npm install loomcal
# or
yarn add loomcal
# or
pnpm add loomcal
```

### Basic Usage

```typescript
import { LoomCal } from 'loomcal';

// Initialize client with your API key
const client = new LoomCal({
  apiKey: 'lc_your_api_key_here',
  baseUrl: 'https://your-loomcal-instance.com', // Optional: defaults to production
  debug: true // Optional: enable request logging
});

// Create a single event
const event = await client.createEvents({
  event: {
    title: 'User Completed Onboarding',
    type: 'onboarding-completion',
    customData: { step: 'welcome-tour', completionRate: 100 },
    user: { identifier: 'user123@example.com' }
  }
});

// Create multiple events in batch
const batchResult = await client.createEvents([
  { event: { title: 'Event 1', user: { identifier: 'user1' } } },
  { event: { title: 'Event 2', user: { identifier: 'user2' } } }
]);

console.log('Event created:', event);
console.log('Batch result:', batchResult);
```

---

## ⚙️ Configuration

### LoomCalConfig Interface

```typescript
interface LoomCalConfig {
  apiKey: string;           // Required: Your API key from LoomCal dashboard
  baseUrl?: string;         // Optional: Custom API endpoint
  timeout?: number;         // Optional: Request timeout (default: 30000ms)
  retries?: number;         // Optional: Retry attempts (default: 3)
  debug?: boolean;          // Optional: Enable debug logging (default: false)setups
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
});
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
}

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
});

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
});

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
});
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
});
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
});

// Batch user creation
const users = await client.createUsers([
  { user: { identifier: "user1", email: "user1@example.com" } },
  { user: { identifier: "user2", email: "user2@example.com" } }
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
});

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
});
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
});
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
});
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
]);

// ❌ Avoid: Multiple individual requests
await client.createEvents({ event: { title: "Event 1", user: { identifier: "user1" } } });
await client.createEvents({ event: { title: "Event 2", user: { identifier: "user2" } } });
await client.createEvents({ event: { title: "Event 3", user: { identifier: "user3" } } });
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
});

// ❌ Avoid: Broad queries without limits
const allEvents = await client.getEvents(); // Could return thousands of records
```

---

## ⚛️ React Components

LoomCal includes React components and hooks for seamless integration:

### Context Provider

```tsx
import { LoomCalProvider } from 'loomcal';

function App() {
  return (
    <LoomCalProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_LOOMCAL_API_KEY!,
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
import { useLoomCal } from 'loomcal';

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
      });
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

## 🚀 Quick Dive: Real-World Example

Let's build a complete learning progress tracker:

```typescript
import { LoomCal } from 'loomcal';

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
    });
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
    });
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
      }),
      
      // Get all started lessons
      this.client.getEvents({
        target: {
          type: 'lesson-start',
          'user.identifier': studentId,
          'customData.courseId': courseId
        }
      })
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
    });

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
    });
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

## 📚 Additional Resources

- **[API Documentation](https://docs.loomcal.neploom.com)** - Complete API reference
- **[Example Projects](https://github.com/Enfiniq/LoomCal/examples)** - Real-world implementations
- **[Dashboard](https://dashboard.loomcal.neploom.com)** - Manage API keys and view analytics
- **[Community Discord](https://discord.gg/loomcal)** - Get help and share ideas

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by the LoomCal Team**