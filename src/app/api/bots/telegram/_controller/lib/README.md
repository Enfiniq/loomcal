# LoomCal Telegram Bot - Step-by-Step User Guide

A powerful Telegram bot for managing calendar events through the LoomCal API. This guide will take you from basic setup to advanced querying and filtering operations.

[LoomCalBot](https://t.me/LoomCalBot)

---

# 📚 Documentation

## 🟢 **Basics** - Essential Setup & Simple Operations
- [Quick Start](#-quick-start)
- [Basic Event Creation](#-basics-creating-events)
- [Simple Queries](#-basics-querying-events)
- [Basic Updates & Deletions](#-basics-updating--deleting-events)

## 🟡 **Intermediate** - Structured Data & Options
- [Working with Time](#-intermediate-time-handling)
- [Using Quotes & Special Characters](#-intermediate-using-quotes-for-special-values)
- [Query Options (Pagination, Sorting)](#-intermediate-query-options)
- [Custom Data & JSON Objects](#-intermediate-custom-data--json)

## 🔴 **Advanced** - Complex Filtering & Operations
- [Direct Operator Usage](#-advanced-direct-operator-usage)
- [Complex Filter Logic](#-advanced-complex-filtering-with-filter-flag)
- [Bulk Operations](#-advanced-bulk-operations)
- [Mixed Approaches & Best Practices](#-advanced-mixed-approaches--best-practices)

---

## 🚀 Quick Start

### 1. Initial Setup
Configure the bot with your LoomCal API key:

```
/setup YOUR_API_KEY
```

**Example:**
```
/setup lc_test_2468ac3f5fee5705a68f267c2d66a32d
```

**Advanced Setup with Custom Configuration:**
```
/setup -api lc_test_2468ac3f5fee5705a68f267c2d66a32d -base https://loomcal.neploom.com -timeout 30000 -retries 3
```

### 2. Basic Commands Overview

| Command | Purpose | Example |
|---------|---------|---------|
| `/setup` | Configure API credentials | `/setup lc_abc123` |
| `/create` | Create new events | `/create "Team Meeting" "Weekly sync"` |
| `/get` | Retrieve/search events | `/get -t "Meeting"` |
| `/update` | Modify existing events | `/update -t "Meeting" -to -t "Updated Meeting"` |
| `/delete` | Remove events | `/delete -t "Old Meeting"` |
| `/help` | Get detailed help | `/help create` |

---

# 🟢 Basics: Creating Events

Start with simple event creation using sequential format or basic flags.

### Sequential Format (Easiest)
```
/create [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options]
```

### Basic Flag Format
```
/create -t [title] -d [description] -rt [startTime] [endTime]
```

### Basic Examples

**Step 1: Simple Event (Title + Description)**
```
/create "Team Meeting" "Weekly sync meeting"
```

**Step 2: Add Time (Relative - minutes from now)**
```
/create -t "Lunch Break" -d "30-minute break" -rt 60 90
```

**Step 3: Add Event Details**
```
/create -t "Project Review" -d "Q4 review" -rt 120 180 -type "meeting" -repeat "weekly" -color "blue"
```

### Field Values Reference

**Repeat Field Values (String):**
- `"daily"` - Repeats every day
- `"weekly"` - Repeats every week  
- `"monthly"` - Repeats every month
- `"yearly"` - Repeats every year
- `"none"` - No repeat (one-time event)

**Common Color Values:**
- `"red"`, `"blue"`, `"green"`, `"yellow"`, `"purple"`, `"orange"`, `"gray"`

**Common Type Values:**
- `"meeting"`, `"call"`, `"conference"`, `"work"`, `"personal"`, `"reminder"`

---

# 🟢 Basics: Querying Events

Start with simple queries to find your events.

### Basic Query Examples

**Step 1: Get All Events**
```
/get
```

**Step 2: Search by Title**
```
/get -t "Meeting"
```

**Step 3: Multiple Simple Criteria**
```
/get -t "Meeting" -type "work" -color "blue"
```

**Step 4: Basic Operators (Introduction)**
```
/get -repeat $ne("none")
/get -t $regex("Meeting")
```

---

# 🟢 Basics: Updating & Deleting Events

Learn to modify and remove events with simple criteria.

### Basic Update Examples

**Step 1: Update by Title**
```
/update -t "Old Meeting" -to -t "New Meeting"
```

**Step 2: Update Multiple Fields**
```
/update -t "Meeting" -to -t "Updated Meeting" -d "Updated description" -color "green"
```

### Basic Delete Examples

**Step 1: Delete by Title**
```
/delete -t "Cancelled Meeting"
```

**Step 2: Delete with Simple Criteria**
```
/delete -type "temp"
```

---

# 🟡 Intermediate: Time Handling

Learn different ways to specify event times.

### Relative Time (`-rt`)
Specify time in minutes from now:

```
/create -t "Meeting" -rt 30 90
```
*Creates event starting 30 minutes from now, ending 90 minutes from now*

### Absolute Time (`-at`)
Specify exact ISO timestamps:

```
/create -t "Meeting" -at "2024-12-25T10:00:00Z" "2024-12-25T11:00:00Z"
```

### Individual Time Flags
```
/create -t "Meeting" -rt -s 60 -e 120
/create -t "Meeting" -at -s "2024-12-25T10:00:00Z" -e "2024-12-25T11:00:00Z"
```

---

# 🟡 Intermediate: Using Quotes for Special Values

Learn when and how to use quotes for complex values.

Use double quotes (`"`) to encapsulate values that contain:
- Multiple spaces: `"Team  Meeting  Room"`
- Hyphens: `"2024-12-25T10:00:00Z"`
- Dollar signs: `"Cost $100"`
- Special characters: `"Meeting @ Conference Room #1"`

### Examples

**Values with spaces:**
```
/create "Team Meeting Room A" "Weekly team sync in room A"
```

**Dates and times:**
```
/create -t "Conference" -at "2024-12-25T10:00:00Z" "2024-12-25T11:00:00Z"
```

**Special characters in operators:**
```
/get -t $regex("Meeting.*Room")
```

---

# 🟡 Intermediate: Query Options

Learn to control how results are returned (pagination, sorting, etc.).

### Available Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `limit` | number | Maximum results to return | `{"limit": 5}` |
| `offset` | number | Skip this many results | `{"offset": 10}` |
| `sortBy` | string | Field to sort by | `{"sortBy": "startTime"}` |
| `sortOrder` | "asc"\|"desc" | Sort direction | `{"sortOrder": "desc"}` |
| `isSigned` | boolean\|object | Signature verification | `{"isSigned": true}` |
| `savingRule` | object | Duplicate handling rules | See below |

### Step-by-Step Options Usage

**Step 1: Basic Pagination**
```
/get -o {"limit": 5}
/get -o {"limit": 10, "offset": 20}
```

**Step 2: Sorting Results**
```
/get -o {"sortBy": "startTime", "sortOrder": "asc"}
/get -o {"sortBy": "title", "sortOrder": "desc"}
```

**Step 3: Advanced Options**
```
/get -o {"limit": 5, "sortBy": "startTime", "sortOrder": "desc"}
```

---

# 🟡 Intermediate: Custom Data & JSON

Learn to work with custom data and JSON objects.

### Custom Data Examples

**Step 1: Simple Custom Data**
```
/create -t "Meeting" -c {"priority": "high"}
```

**Step 2: Complex Custom Data**
```
/create -t "Project Review" -c {"priority": "high", "department": "engineering", "attendees": 5}
```

**Step 3: Query by Custom Data**
```
/get -c {"priority": "high"}
```

### Event with Options

**Step 1: Basic Options**
```
/create "Daily Standup" "Team sync" -o {"isSigned": true}
```

**Step 2: Saving Rules**
```
/create "Meeting" -o {"savingRule": {"onDuplicate": "ignore", "uniquenessFields": ["title", "startTime"]}}
```

---

# 🔴 Advanced: Direct Operator Usage

Master using operators directly with flags for powerful queries.

### Operator Types & Syntax

#### Single Argument Operators
**Format**: `-field $operator(value)`

```
/get -t $regex("(?i)meeting")
/get -repeat $eq("weekly")
/get -startTime $gte("2024-01-01T00:00:00Z")
/get -type $ne("cancelled")
```

#### Multi Argument Operators  
**Format**: `-field $operator(value1, value2, ...)`

```
/get -type $in("meeting", "call", "conference")
/get -color $nin("red", "yellow")
```

#### Document Level Operators
**Format**: `-field $operator(condition1, condition2, ...)`

```
/get -t $or("Meeting", "Call")
/get -type $and("meeting", $not("cancelled"))
```

### Advanced Operator Combinations

**Step 1: Single Field, Multiple Conditions**
```
/get -startTime $and($gte("2024-01-01"), $lt("2024-02-01"))
/get -repeat $or($eq("weekly"), $eq("daily"))
```

**Step 2: Multiple Fields with Operators**
```
/get -t $regex("(?i)meeting") -repeat $ne("none") -startTime $gte("2024-01-01T00:00:00Z")
/get -type $in("meeting", "conference") -repeat $in("daily", "weekly")
```

---

# 🔴 Advanced: Complex Filtering with Filter Flag

Use the `-f` flag for complex MongoDB-style queries.

### When to Use Filter Flag vs Direct Operators

**Use Filter Flag (`-f`) for:**
- Complex nested logic
- Multiple document-level operators
- CustomData Filtering
- Deep conditional structures

### Advanced Filter Examples

**Step 1: Complex Logical Queries**
```
/get -f {"$or": [{"title": "Meeting"}, {"title": "Call"}]}
/get -f {"$and": [{"type": "meeting"}, {"repeat": "weekly"}]}
```

**Step 2: Nested Document Logic**
```
/get -f {"$or": [{"$and": [{"type": "meeting"}, {"priority": "high"}]}, {"urgent": true}]}
```

**Step 3: Complex Date Ranges**
```
/get -f {"startTime": {"$gte": "2024-01-01T00:00:00Z", "$lt": "2024-02-01T00:00:00Z"}}
```

### Comparing Approaches

```bash
# Direct operators (simpler)
/get -t $regex("(?i)meeting") -repeat $ne("none")

# Filter flag (equivalent)
/get -f {"$and": [{"title": {"$regex": "(?i)meeting"}}, {"repeat": {"$ne": "none"}}]}
```

---

# 🔴 Advanced: Bulk Operations

Perform operations on multiple events efficiently.

### Bulk Updates

**Step 1: Simple Bulk Update**
```
/update -type $in("temp", "test") -to -color "gray"
```

**Step 2: Complex Bulk Update**
```
/update -type $in("temp", "test") -startTime $lt("2024-01-01T00:00:00Z") -to -color "gray"
```

**Step 3: Filter-Based Bulk Update**
```
/update -f {"$and": [{"type": "temp"}, {"startTime": {"$lt": "2024-01-01T00:00:00Z"}}]} -to -color "gray" -c {"archived": true, "status": "completed"}
```

### Bulk Deletions

**Step 1: Simple Bulk Delete**
```
/delete -type $in("temp", "test")
```

**Step 2: Conditional Bulk Delete with Limits**
```
/delete -status $in("cancelled", "expired") -repeat $eq("none") -o {"limit": 10}
```

**Step 3: Complex Conditional Delete**
```
/delete -f {"$or": [{"status": "cancelled"}, {"$and": [{"type": "test"}, {"startTime": {"$lt": "2024-01-01T00:00:00Z"}}]}]} -o {"limit": 10}
```

---

# 🔴 Advanced: Mixed Approaches & Best Practices

Combine different techniques for maximum flexibility.

### Mixed Operator Approaches

**Direct Operators + Filter Flag**
```
/get -t $regex("(?i)important") -f {"$or": [{"customData.department": "engineering"}, {"customData.department": "sales"}]} -o {"sortBy": "startTime"}
```

**Sequential + Flag Approach**
```
/get $regex("(?i)meeting") -type "work" -repeat $ne("none") -o {"sortBy": "startTime", "sortOrder": "desc"}
```

### Real-World Complex Examples

**Complete Event Management Workflow**
```
# 1. Create complex event
/create -t "Q4 All-Hands Meeting" -d "Quarterly company meeting with presentations" -at "2024-12-15T14:00:00Z" "2024-12-15T16:00:00Z" -type "company-meeting" -repeat "quarterly" -color "purple" -r "https://meet.company.com/q4-meeting" -c {"mandatory": true, "departments": ["engineering", "sales", "marketing"], "presenter": "CEO", "agenda": "Q4 results and Q1 planning"} -o {"isSigned": {"check": true, "createUser": true}, "savingRule": {"onDuplicate": "update", "uniquenessFields": ["title", "startTime"]}}

# 2. Query with complex conditions
/get -f {"$and": [{"type": "meeting"}, {"$or": [{"customData.priority": "high"}, {"customData.urgent": true}]}, {"startTime": {"$gte": "2024-01-01T00:00:00Z"}}, {"repeat": {"$ne": "none"}}]} -o {"limit": 20, "sortBy": "startTime", "sortOrder": "asc"}

# 3. Complex update with mixed approach
/update -t $regex("(?i)old.*meeting") -repeat $in("daily", "weekly") -to -t "Updated Recurring Meeting" -color "green"
```

### Available Operators Reference

| Operator | Type | Description | Direct Usage Example |
|----------|------|-------------|---------------------|
| `$eq` | Single | Equal to | `-type $eq("meeting")` |
| `$ne` | Single | Not equal to | `-status $ne("cancelled")` |
| `$gt` | Single | Greater than | `-duration $gt(60)` |
| `$gte` | Single | Greater than or equal | `-startTime $gte("2024-01-01")` |
| `$lt` | Single | Less than | `-duration $lt(60)` |
| `$lte` | Single | Less than or equal | `-priority $lte(3)` |
| `$regex` | Single | Regular expression | `-t $regex("(?i)meeting")` |
| `$exists` | Single | Field exists | `-c $exists(true)` |
| `$not` | Single | Logical NOT | `-status $not("cancelled")` |
| `$in` | Multi | Value in array | `-type $in("meeting", "call")` |
| `$nin` | Multi | Value not in array | `-status $nin("cancelled", "postponed")` |
| `$and` | Document | Logical AND | `-t $and("Meeting", $regex("(?i)team"))` |
| `$or` | Document | Logical OR | `-priority $or("high", "urgent")` |

---

## 📚 Quick Reference

### 🏷️ Available Flags Reference

| Flag | Description | Usage | Example |
|------|-------------|-------|---------|
| `-t` | Title | `-t "Meeting Title"` | `/get -t "Team Meeting"` |
| `-d` | Description | `-d "Meeting description"` | `/create -t "Meeting" -d "Weekly sync"` |
| `-rt` | Relative time | `-rt 60 120` (minutes from now) | `/create -t "Meeting" -rt 30 90` |
| `-at` | Absolute time | `-at "ISO_DATE" "ISO_DATE"` | `/create -t "Meeting" -at "2024-12-25T10:00:00Z" "2024-12-25T11:00:00Z"` |
| `-s` | Start time | `-rt -s 60` or `-at -s "ISO_DATE"` | `/create -t "Meeting" -rt -s 60 -e 120` |
| `-e` | End time | `-rt -e 120` or `-at -e "ISO_DATE"` | `/create -t "Meeting" -at -s "2024-12-25T10:00:00Z" -e "2024-12-25T11:00:00Z"` |
| `-type` | Event type | `-type "meeting"` | `/get -type "work"` |
| `-repeat` | Repeat pattern | `-repeat "weekly"` | ````
/create -t "Meeting" -repeat "daily"
```` |
| `-color` | Event color | `-color "blue"` | `/update -t "Meeting" -to -color "red"` |
| `-r` | Resource URL | `-r "https://meet.google.com/abc"` | `/create -t "Meeting" -r "https://zoom.us/j/123"` |
| `-c` | Custom data (JSON) | `-c {"key": "value"}` | `/create -t "Meeting" -c {"priority": "high"}` |
| `-o` | Options (JSON) | `-o {"limit": 10}` | `/get -o {"limit": 5, "sortBy": "startTime"}` |
| `-f` | Filter (JSON) | `-f {"title": "Meeting"}` | `/get -f {"type": "meeting", "repeat": "weekly"}` |
| `-to` | Update target | `-to -t "New Title"` | `/update -t "Old" -to -t "New" -color "green"` |

### 🔍 Learning Resources

#### Built-in Help Commands
- `/help` - General help and command overview
- `/help setup` - Setup instructions and examples  
- `/help create` - Event creation examples
- `/help get` - Query and filtering examples
- `/help update` - Update operation examples
- `/help delete` - Delete operation examples
- `/help flag` - Complete flag reference
- `/help operator` - Available operators reference

#### Step-by-Step Learning
1. **Start with Basics**: Simple create/get operations
2. **Learn Operators**: Use direct operators like `-t $regex("meeting")`
3. **Master Options**: Pagination, sorting, and result control
4. **Advanced Filtering**: Complex queries with `-f` flag
5. **Bulk Operations**: Multi-event updates and deletions

---

## 🔧 Troubleshooting & Best Practices

### Common Issues

1. **Invalid JSON**: Ensure proper JSON syntax with quotes around keys and string values
2. **Date Format**: Use ISO 8601 format for absolute times: `2024-12-25T10:00:00Z`
3. **Special Characters**: Use quotes around values containing spaces, hyphens, or special characters
4. **Operator Syntax**: Remember to use correct flag names (e.g., `-t` not `-title`)
5. **Filter vs Direct Operators**: Choose the right approach for your complexity level

### Error Messages
- `Missing required parameters` - Check that required fields are provided
- `Invalid JSON format` - Verify JSON syntax in filters, options, or custom data
- `Update command requires -to flag` - Include `-to` flag when using update command
- `No events match criteria` - Broaden your search criteria or check spelling

### Performance Tips
- Use `limit` option to control result size
- Use specific filters to reduce query scope
- Test complex filters with `/get` before using in `/update` or `/delete`
- Use quotes consistently for values with special characters
- Keep custom data objects simple and well-structured

---

**Congratulations!** 🎉 You're now ready to use the LoomCal Telegram Bot like a pro!
