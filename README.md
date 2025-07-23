# LoomCal Bot

LoomCal Bot is a powerful, flexible event tracking bot that treats **everything as an event**. Whether it's learning progress, user activities, system events, or custom workflows, Bot integrations makes it easy to capture, analyze, and act upon any trackable action, while staying in the telegram application.
LoomCal bot is basically a wrapper for the database (postgresql), which makes it easy to create, update, read and delete the events.
Start a conversation with [`@LoomCalBot`](https://t.me/LoomCalBot) and manage your events on the go.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **API**: REST
  
## Setup
Firstly, head to this url: [Web](https://web.telegram.org/k/#@LoomCalBot) or [T](https://t.me/LoomCalBot)
Then, /start will make introduce with few commands.
Then, /help command will make you clear about the available commands.
If you need help for certain available commands like /create, /get, /update, /delete, then type /help [commandName]. e.g. /help create.
Then, setup your LoomCal Bot using an API Key. For now, you can use the command below.
`bash
/setup -api lc_test_2468ac3f5fee5705a68f267c2d66a32d -base https://loomcal.neploom.com
`
Then, start using the LoomCal Bot.

### /create
If you decide to create an event using LoomCal Bot, /create would be used to create those events.
There are two ways of creating event. 
(1) First way is arranging your data about events like title, description, startTime, endTime, type, repeat, color, resource, customData (Any other data which you want to include), and options.
```
/create [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options]
```
e.g.
/create "Workout" "At Nepal Gym" 0 45 "gym" "daily" "#0000ff" "https://nepalgym.com/exercise/triceps" {"price": 500}
(2) Second way is using flags. Using flags will allow you to break the order of data to be passed.
```
/create -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [repeat] -color [color] -r [resource] -c [customData] -o [options]
```
e.g.
/create "Workout" "At Nepal Gym" -repeat "daily" -rt 0 45 -c {"price": 500}

So, Moral of the story is if you want quick and easy operations use First way, and if you want granular level control use Second way.
And, If you're using Second way, keep in mind that you can mix the sequence, and wherever you want to break the sequence, onwards use flags. 

### /get 
If you decide to get the created events using LoomCal Bot, /get would be used to get those events.
There are three ways of getting events.
(1) First way helps you retrive all the events.
```
/get
```
e.g.
/get
(2) Second way is passing the value you expect from the events like title, description, startTime, endTime, type, repeat, color, resource, customData (Any other data which you want to include), options, and filters.
```
/get [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options] [filters]
```
e.g.
/get "Workout" "At Nepal Gym"
(3) Third way is using flags. Using flags will allow you to break the order of data to be passed.
```
/get -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [repeat] -color [color] -r [resource] -c [customData] -o [options] -f [filters]
```
e.g.
/get -t "Workout"  -repeat "daily"

### /update 
If you decide to update the event using LoomCal Bot, /update would be used to delete those events.
There are two ways of updating events.
(1) First way is passing the values you expect the events have, so that you can pass the data to be updated like title, description, startTime, endTime, type, repeat, color, resource, customData (Any other data which you want to include), options, and filters and using -to flag to pass the data you want to update.
Inshot, /update [get] -to [update]
```
/update [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options] [filters] -to [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData]
```
e.g.
/update "Workout" "At Nepal Gym" -to "Workout with Lunching"
(2) Second way is using flags. Using flags will allow you to break the order of data to be passed.
```
/update -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [repeat] -color [color] -r [resource] -c [customData] -o [options] -f [filters] -to -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [repeat] -color [color] -r [resource] -c [customData]
```
e.g.
/update -t "Workout" -repeat "daily" -to -type "making-triceps"

### /delete 
If you decide to get the created events using LoomCal Bot, /delete would be used to delete those events.
There are three ways of deleting events.
(1) First way helps you delete all the events (With caution as it will delete all events)
```
/delete
```
e.g.
/delete
(2) Second way is passing the value you expect from the events so that those events could be deleted like title, description, startTime, endTime, type, repeat, color, resource, customData (Any other data which you want to include), options, and filters.
```
/delete [title] [description] [startTime] [endTime] [type] [repeat] [color] [resource] [customData] [options] [filters]
```
e.g.
/get "Workout" "At Nepal Gym"
(3) Third way is using flags. Using flags will allow you to break the order of data to be passed.
```
/delete -t [title] -d [description] -rt [startTime] [endTime] -type [type] -repeat [repeat] -color [color] -r [resource] -c [customData] -o [options] -f [filters]
```
e.g.
/delete -t "Workout"  -repeat "daily"

## Some Basic things that you must know.

### customData
It is literally customData that you can pass as either js object format or json object format (No Array).

### -rt and -at
- rt stands for relative time, where you need to pass the number in minutes from now (!50 represents 50 minutes before from now, 50 represents 50 minutes after from now, 0 means now).
- at stands for absolute time, where you need to pass the string in Actual Date format.
- Though startTime comes first and endTime comes second, you can tweak that using -s, and -e flags.
  - e.g. -rt -e 60
 
### operators
Operators are the symbol that represent the type of comparison, logics needs to be applied for quering data.
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

These list of operators can be used in LoomCal. Single means they accept single argument, Multi means they accept multiple arguments, and Document means they can have another operator as their arguments.
e.g. /get $regex("Work*")
e.g. /get -type $nin("workout", "gym", "making-tricepts") -t $regex("W*")

### Filters
They are extended form of operators, mostly recommend using in SDK, but you can use here for complex queries.
e.g. -f {$and: [{title: {$regex: "W*"}}, {repeat: "daily"}]}

### Options
It is a USP of LoomCal. It is the options that will be checked to store, retrive, update and delete data. Commonly, you can use limit, sortBy, sortOrder, offset for get, update and delete, and use savingRule for create.
```
{limit: number, offset: number, sortBy: string, sortOrder: string, savingRule: {timeBetweenDuplicates: number, uniquenessFields: string[], onDuplicate: string}}
```
  - limit: Limit of events you want
  - offset: Number of events you want to skip
  - sortBy: On the basis of what field you want to sort the events
  - sortOrder: 'asc' will sort the events in ascending order, 'desc' will sort your events in descending order.
  - savingRule
    - timeBetweenDuplicates holds number, -1 represents always check the uniquenessFields, 0 represents never check the uniquenessFields, and number represents check only if the event was created within the passed time in seconds.
    - uniquenessFields represents the fields need to be checked.
    - onDuplicate represents the action which needs to be done. 'update' will update the most recent one, 'ignore' will silently ignore that, 'reject' (Won't work for here)

isSigned isnot used here! More about options can be read in the [SDK Documentation](/src/sdk/README.md).

e.g. {limit: 5, offset: 5, sortBy: "startTime", sortOrder: "desc"}
e.g. {savingRule: {timeBetweenDuplicates: -1, uniquenessFields: ["title"], onDuplicate: "update"}}

### Flags
| Flag | Description | Usage | Example |
|------|-------------|-------|---------|
| `-t` | Title | `-t "Meeting Title"` | `/get -t "Team Meeting"` |
| `-d` | Description | `-d "Meeting description"` | `/create -t "Meeting" -d "Weekly sync"` |
| `-rt` | Relative time | `-rt 60 120` (minutes from now) | `/create -t "Meeting" -rt 30 90` |
| `-at` | Absolute time | `-at "ISO_DATE" "ISO_DATE"` | `/create -t "Meeting" -at "2024-12-25T10:00:00Z" "2024-12-25T11:00:00Z"` |
| `-s` | Start time | `-rt -s 60` or `-at -s "ISO_DATE"` | `/create -t "Meeting" -rt -s 60 -e 120` |
| `-e` | End time | `-rt -e 120` or `-at -e "ISO_DATE"` | `/create -t "Meeting" -at -s "2024-12-25T10:00:00Z" -e "2024-12-25T11:00:00Z"` |
| `-type` | Event type | `-type "meeting"` | `/get -type "work"` |
| `-repeat` | Repeat pattern | `-repeat "weekly"` | ````/create -t "Meeting" -repeat "daily"```` |
| `-color` | Event color | `-color "blue"` | `/update -t "Meeting" -to -color "red"` |
| `-r` | Resource URL | `-r "https://meet.google.com/abc"` | `/create -t "Meeting" -r "https://zoom.us/j/123"` |
| `-c` | Custom data (JSON) | `-c {"key": "value"}` | `/create -t "Meeting" -c {"priority": "high"}` |
| `-o` | Options (JSON) | `-o {"limit": 10}` | `/get -o {"limit": 5, "sortBy": "startTime"}` |
| `-f` | Filter (JSON) | `-f {"title": "Meeting"}` | `/get -f {"type": "meeting", "repeat": "weekly"}` |
| `-to` | Update target | `-to -t "New Title"` | `/update -t "Old" -to -t "New" -color "green"` |

## Extra Details About The Project

## Support

- 📧 Email: info@neploom.com
- 🐛 Issues: [GitHub Issues](https://github.com/Enfiniq/loomcal/issues)

## Contributors

- **Enfiniq (me)** —> SDK, API, Telegram Bot and APP development
- **AI** —> Helped with README generation, copy writing, adding comments, regex, constants, parsing logic, scanning logic, message texts, and optimising the logic for flag detection.

## Acknowledgments

- Inspired by modern calendar applications

## SDK Documentation

[**Partial SDK Documentation →**](/src/sdk/README.md)
[**AI Generation Telegram Bot Documentation →**](/src/app//api//bots/telegram/_controller/lib/README.md)

**Made with ❤️ by the LoomCal & NepLoom Team**
