export type Template = {
  id: string;
  category: string;
  title: string;
  icon: string;
  description: string;
  type: 'document' | 'database';
  schema?: any[];
  initialTasks?: any[];
  blocks?: any[];
};

export const TEMPLATES: Template[] = [
  // PERSONAL & LIFE
  {
    id: "habit-tracker",
    category: "Personal & Life",
    title: "Habit Tracker",
    icon: "✅",
    description: "Track your daily habits and routines.",
    type: "database",
    schema: [
      { key: "habit", name: "Habit", type: "text" },
      { key: "frequency", name: "Frequency", type: "select", options: ["Daily", "Weekly", "Monthly"] },
      { key: "timeOfDay", name: "Time of Day", type: "select", options: ["Morning", "Afternoon", "Evening"] },
      { key: "active", name: "Active", type: "checkbox" }
    ],
    initialTasks: [
      { title: "Drink 2L Water", properties: { habit: "Drink 2L Water", frequency: "Daily", timeOfDay: "Morning", active: true } },
      { title: "Read 10 Pages", properties: { habit: "Read 10 Pages", frequency: "Daily", timeOfDay: "Evening", active: true } },
      { title: "Workout", properties: { habit: "Workout", frequency: "Weekly", timeOfDay: "Morning", active: true } },
    ]
  },
  {
    id: "reading-list",
    category: "Personal & Life",
    title: "Reading List",
    icon: "📚",
    description: "Keep track of books you want to read.",
    type: "database",
    schema: [
      { key: "author", name: "Author", type: "text" },
      { key: "status", name: "Status", type: "status", options: ["To Read", "Reading", "Finished"] },
      { key: "rating", name: "Rating", type: "select", options: ["⭐️⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️", "⭐️⭐️", "⭐️"] },
      { key: "genre", name: "Genre", type: "select", options: ["Fiction", "Non-Fiction", "Sci-Fi", "Fantasy", "Biography"] }
    ],
    initialTasks: [
      { title: "Atomic Habits", properties: { author: "James Clear", status: "Finished", rating: "⭐️⭐️⭐️⭐️⭐️", genre: "Non-Fiction" } },
      { title: "Dune", properties: { author: "Frank Herbert", status: "To Read", genre: "Sci-Fi" } },
    ]
  },
  {
    id: "journal",
    category: "Personal & Life",
    title: "Daily Journal",
    icon: "📔",
    description: "A simple template for daily reflections.",
    type: "document",
    blocks: [
      { type: "h1", text: "Daily Journal" },
      { type: "h2", text: "Today's Intention" },
      { type: "p", text: "What is my main focus for today?" },
      { type: "h2", text: "Gratitude" },
      { type: "list", text: "I am grateful for..." },
      { type: "h2", text: "Evening Reflection" },
      { type: "p", text: "How did today go? What could I do better?" },
    ]
  },
  {
    id: "travel-planner",
    category: "Personal & Life",
    title: "Travel Planner",
    icon: "✈️",
    description: "Plan your trips and itineraries.",
    type: "database",
    schema: [
      { key: "destination", name: "Destination", type: "text" },
      { key: "startDate", name: "Start Date", type: "date" },
      { key: "endDate", name: "End Date", type: "date" },
      { key: "status", name: "Status", type: "status", options: ["Idea", "Planned", "Booked", "Completed"] }
    ],
    initialTasks: [
      { title: "Trip to Japan", properties: { destination: "Tokyo, Kyoto", startDate: "2024-04-01", endDate: "2024-04-14", status: "Idea" } },
      { title: "Weekend Getaway", properties: { destination: "Cabin in the Woods", status: "Booked" } }
    ]
  },
  {
    id: "recipe-book",
    category: "Personal & Life",
    title: "Recipe Book",
    icon: "🍳",
    description: "Save and organize your favorite recipes.",
    type: "database",
    schema: [
      { key: "difficulty", name: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard"] },
      { key: "time", name: "Time (mins)", type: "number" },
      { key: "type", name: "Type", type: "select", options: ["Breakfast", "Lunch", "Dinner", "Dessert", "Snack"] },
      { key: "rating", name: "Rating", type: "select", options: ["⭐️⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️"] }
    ],
    initialTasks: [
      { title: "Pancakes", properties: { difficulty: "Easy", time: 20, type: "Breakfast", rating: "⭐️⭐️⭐️⭐️" } },
      { title: "Spaghetti Bolognese", properties: { difficulty: "Medium", time: 45, type: "Dinner", rating: "⭐️⭐️⭐️⭐️⭐️" } }
    ]
  },
  {
    id: "movie-tracker",
    category: "Personal & Life",
    title: "Movie Tracker",
    icon: "🍿",
    description: "Movies to watch and reviews.",
    type: "database",
    schema: [
      { key: "genre", name: "Genre", type: "select", options: ["Action", "Comedy", "Drama", "Horror", "Sci-Fi"] },
      { key: "status", name: "Status", type: "status", options: ["Want to Watch", "Watched"] },
      { key: "rating", name: "Rating", type: "select", options: ["⭐️⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️"] }
    ]
  },
  {
    id: "workout-tracker",
    category: "Personal & Life",
    title: "Workout Tracker",
    icon: "🏋️",
    description: "Log your daily exercises and progress.",
    type: "database",
    schema: [
      { key: "date", name: "Date", type: "date" },
      { key: "type", name: "Type", type: "select", options: ["Cardio", "Strength", "Yoga", "Sports"] },
      { key: "duration", name: "Duration (mins)", type: "number" },
      { key: "calories", name: "Calories Burned", type: "number" }
    ]
  },
  {
    id: "grocery-list",
    category: "Personal & Life",
    title: "Grocery List",
    icon: "🛒",
    description: "Simple checklist for groceries.",
    type: "document",
    blocks: [
      { type: "h1", text: "Grocery List" },
      { type: "h2", text: "Produce" },
      { type: "todo", text: "Apples" },
      { type: "todo", text: "Spinach" },
      { type: "h2", text: "Dairy" },
      { type: "todo", text: "Milk" },
      { type: "todo", text: "Cheese" }
    ]
  },
  {
    id: "household-chores",
    category: "Personal & Life",
    title: "Household Chores",
    icon: "🧹",
    description: "Keep track of cleaning routines.",
    type: "database",
    schema: [
      { key: "room", name: "Room", type: "select", options: ["Kitchen", "Bathroom", "Living Room", "Bedroom"] },
      { key: "frequency", name: "Frequency", type: "select", options: ["Daily", "Weekly", "Monthly"] },
      { key: "lastDone", name: "Last Done", type: "date" }
    ]
  },
  {
    id: "pet-care",
    category: "Personal & Life",
    title: "Pet Care Log",
    icon: "🐾",
    description: "Track vet visits, feeding, and meds.",
    type: "database",
    schema: [
      { key: "petName", name: "Pet Name", type: "text" },
      { key: "category", name: "Category", type: "select", options: ["Food", "Medication", "Vet Visit", "Grooming"] },
      { key: "date", name: "Date", type: "date" }
    ]
  },

  // WORK & PRODUCTIVITY
  {
    id: "task-manager",
    category: "Work & Productivity",
    title: "Task Manager",
    icon: "📋",
    description: "Manage your tasks and to-dos.",
    type: "database",
    schema: [
      { key: "status", name: "Status", type: "status", options: ["To Do", "In Progress", "Blocked", "Done"] },
      { key: "priority", name: "Priority", type: "select", options: ["High", "Medium", "Low"] },
      { key: "dueDate", name: "Due Date", type: "date" },
      { key: "assignee", name: "Assignee", type: "text" }
    ],
    initialTasks: [
      { title: "Review Q3 Report", properties: { status: "To Do", priority: "High", assignee: "Self" } },
      { title: "Update Website", properties: { status: "In Progress", priority: "Medium", assignee: "Self" } }
    ]
  },
  {
    id: "meeting-notes",
    category: "Work & Productivity",
    title: "Meeting Notes",
    icon: "🤝",
    description: "Template for capturing meeting minutes.",
    type: "document",
    blocks: [
      { type: "h1", text: "Meeting Notes: [Project Name]" },
      { type: "h3", text: "Date: YYYY-MM-DD | Attendees: " },
      { type: "h2", text: "Agenda" },
      { type: "list", text: "Discuss current progress" },
      { type: "h2", text: "Notes" },
      { type: "p", text: "Write notes here..." },
      { type: "h2", text: "Action Items" },
      { type: "todo", text: "[Action] - assigned to [Person]" }
    ]
  },
  {
    id: "project-tracker",
    category: "Work & Productivity",
    title: "Project Tracker",
    icon: "🚀",
    description: "Track active projects and their status.",
    type: "database",
    schema: [
      { key: "status", name: "Status", type: "status", options: ["Planning", "Active", "On Hold", "Completed"] },
      { key: "lead", name: "Project Lead", type: "text" },
      { key: "deadline", name: "Deadline", type: "date" },
      { key: "budget", name: "Budget", type: "number" }
    ],
    initialTasks: [
      { title: "Website Redesign", properties: { status: "Active", lead: "Alice", budget: 5000 } },
      { title: "Marketing Campaign", properties: { status: "Planning", lead: "Bob", budget: 2000 } }
    ]
  },
  {
    id: "content-calendar",
    category: "Work & Productivity",
    title: "Content Calendar",
    icon: "📅",
    description: "Schedule blog posts and social media.",
    type: "database",
    schema: [
      { key: "status", name: "Status", type: "status", options: ["Idea", "Drafting", "Review", "Scheduled", "Published"] },
      { key: "platform", name: "Platform", type: "select", options: ["Blog", "Twitter", "LinkedIn", "Instagram"] },
      { key: "publishDate", name: "Publish Date", type: "date" },
      { key: "author", name: "Author", type: "text" }
    ]
  },
  {
    id: "crm",
    category: "Work & Productivity",
    title: "Simple CRM",
    icon: "👥",
    description: "Track clients and deals.",
    type: "database",
    schema: [
      { key: "company", name: "Company", type: "text" },
      { key: "status", name: "Status", type: "status", options: ["Lead", "Contacted", "Proposal", "Negotiation", "Closed Won", "Closed Lost"] },
      { key: "email", name: "Email", type: "text" },
      { key: "value", name: "Deal Value", type: "number" }
    ]
  },
  {
    id: "job-applications",
    category: "Work & Productivity",
    title: "Job Applications",
    icon: "💼",
    description: "Keep track of job hunts.",
    type: "database",
    schema: [
      { key: "company", name: "Company", type: "text" },
      { key: "role", name: "Role", type: "text" },
      { key: "status", name: "Status", type: "status", options: ["Bookmarked", "Applied", "Interviewing", "Offer", "Rejected"] },
      { key: "dateApplied", name: "Date Applied", type: "date" }
    ]
  },
  {
    id: "okr-tracker",
    category: "Work & Productivity",
    title: "OKR Tracker",
    icon: "🎯",
    description: "Objectives and Key Results.",
    type: "database",
    schema: [
      { key: "type", name: "Type", type: "select", options: ["Objective", "Key Result"] },
      { key: "status", name: "Status", type: "status", options: ["On Track", "At Risk", "Off Track", "Completed"] },
      { key: "progress", name: "Progress %", type: "number" },
      { key: "owner", name: "Owner", type: "text" }
    ]
  },
  {
    id: "bug-tracker",
    category: "Work & Productivity",
    title: "Bug Tracker",
    icon: "🐛",
    description: "Track software bugs and issues.",
    type: "database",
    schema: [
      { key: "status", name: "Status", type: "status", options: ["Open", "In Progress", "In Review", "Resolved"] },
      { key: "priority", name: "Priority", type: "select", options: ["Critical", "High", "Medium", "Low"] },
      { key: "environment", name: "Environment", type: "select", options: ["Production", "Staging", "Local"] }
    ]
  },
  {
    id: "freelance-clients",
    category: "Work & Productivity",
    title: "Freelance Clients",
    icon: "🤝",
    description: "Manage freelance client details.",
    type: "database",
    schema: [
      { key: "contact", name: "Contact Name", type: "text" },
      { key: "hourlyRate", name: "Hourly Rate", type: "number" },
      { key: "status", name: "Status", type: "status", options: ["Active", "Past", "Prospect"] }
    ]
  },
  {
    id: "resume",
    category: "Work & Productivity",
    title: "Resume Draft",
    icon: "📄",
    description: "Draft your resume.",
    type: "document",
    blocks: [
      { type: "h1", text: "John Doe" },
      { type: "p", text: "Software Engineer | john@example.com | 555-0100" },
      { type: "h2", text: "Experience" },
      { type: "h3", text: "Senior Developer - Tech Corp (2020-Present)" },
      { type: "list", text: "Led migration to React" },
      { type: "list", text: "Improved performance by 40%" }
    ]
  },

  // EDUCATION
  {
    id: "class-notes",
    category: "Education",
    title: "Class Notes",
    icon: "📝",
    description: "Structured template for lecture notes.",
    type: "document",
    blocks: [
      { type: "h1", text: "Class: [Subject Name]" },
      { type: "h3", text: "Date: YYYY-MM-DD" },
      { type: "h2", text: "Key Concepts" },
      { type: "list", text: "Concept 1: Definition" },
      { type: "h2", text: "Detailed Notes" },
      { type: "p", text: "..." },
      { type: "h2", text: "Questions to Ask" },
      { type: "todo", text: "Clarify topic X" }
    ]
  },
  {
    id: "course-schedule",
    category: "Education",
    title: "Course Schedule",
    icon: "🏫",
    description: "Organize your classes and times.",
    type: "database",
    schema: [
      { key: "courseCode", name: "Course Code", type: "text" },
      { key: "day", name: "Day", type: "select", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
      { key: "time", name: "Time", type: "text" },
      { key: "location", name: "Location", type: "text" }
    ]
  },
  {
    id: "assignment-tracker",
    category: "Education",
    title: "Assignment Tracker",
    icon: "🎒",
    description: "Track homework and projects.",
    type: "database",
    schema: [
      { key: "course", name: "Course", type: "text" },
      { key: "dueDate", name: "Due Date", type: "date" },
      { key: "status", name: "Status", type: "status", options: ["Not Started", "Working", "Submitted", "Graded"] },
      { key: "grade", name: "Grade", type: "text" }
    ]
  },
  {
    id: "vocabulary-list",
    category: "Education",
    title: "Vocabulary List",
    icon: "🔤",
    description: "Learn new words.",
    type: "database",
    schema: [
      { key: "word", name: "Word", type: "text" },
      { key: "definition", name: "Definition", type: "text" },
      { key: "language", name: "Language", type: "select", options: ["English", "Spanish", "French", "German", "Other"] },
      { key: "memorized", name: "Memorized", type: "checkbox" }
    ]
  },
  {
    id: "thesis-planner",
    category: "Education",
    title: "Thesis Planner",
    icon: "🎓",
    description: "Plan your dissertation.",
    type: "database",
    schema: [
      { key: "chapter", name: "Chapter", type: "text" },
      { key: "status", name: "Status", type: "status", options: ["Research", "Drafting", "Reviewing", "Final"] },
      { key: "wordCount", name: "Word Count", type: "number" }
    ]
  },
  {
    id: "reading-summary",
    category: "Education",
    title: "Reading Summary",
    icon: "📖",
    description: "Summarize academic papers.",
    type: "document",
    blocks: [
      { type: "h1", text: "Paper: [Title]" },
      { type: "h3", text: "Author: [Author] | Year: [Year]" },
      { type: "h2", text: "Main Argument" },
      { type: "p", text: "..." },
      { type: "h2", text: "Methodology" },
      { type: "p", text: "..." },
      { type: "h2", text: "Critique" },
      { type: "p", text: "..." },
    ]
  },
  {
    id: "study-schedule",
    category: "Education",
    title: "Study Schedule",
    icon: "⏰",
    description: "Plan study blocks for exams.",
    type: "database",
    schema: [
      { key: "topic", name: "Topic", type: "text" },
      { key: "date", name: "Date", type: "date" },
      { key: "duration", name: "Duration (hrs)", type: "number" }
    ]
  },
  {
    id: "group-project",
    category: "Education",
    title: "Group Project",
    icon: "👥",
    description: "Organize group work.",
    type: "database",
    schema: [
      { key: "task", name: "Task", type: "text" },
      { key: "member", name: "Member", type: "text" },
      { key: "deadline", name: "Deadline", type: "date" },
      { key: "status", name: "Status", type: "status", options: ["To Do", "Doing", "Done"] }
    ]
  },
  {
    id: "grade-calculator",
    category: "Education",
    title: "Grade Calculator",
    icon: "💯",
    description: "Track your scores.",
    type: "database",
    schema: [
      { key: "assignment", name: "Assignment", type: "text" },
      { key: "weight", name: "Weight %", type: "number" },
      { key: "score", name: "Score %", type: "number" }
    ]
  },
  {
    id: "lecture-recordings",
    category: "Education",
    title: "Lecture Recordings",
    icon: "🎙️",
    description: "Track links to recordings.",
    type: "database",
    schema: [
      { key: "date", name: "Date", type: "date" },
      { key: "course", name: "Course", type: "text" },
      { key: "watched", name: "Watched", type: "checkbox" },
      { key: "link", name: "Link", type: "text" }
    ]
  },

  // FINANCE
  {
    id: "expense-tracker",
    category: "Finance",
    title: "Expense Tracker",
    icon: "💸",
    description: "Track your daily expenses.",
    type: "database",
    schema: [
      { key: "amount", name: "Amount", type: "number" },
      { key: "category", name: "Category", type: "select", options: ["Food", "Transport", "Entertainment", "Bills", "Shopping"] },
      { key: "date", name: "Date", type: "date" },
      { key: "merchant", name: "Merchant", type: "text" }
    ],
    initialTasks: [
      { title: "Lunch", properties: { amount: 15.50, category: "Food", merchant: "Cafe" } },
      { title: "Uber", properties: { amount: 20.00, category: "Transport", merchant: "Uber" } }
    ]
  },
  {
    id: "subscription-tracker",
    category: "Finance",
    title: "Subscription Tracker",
    icon: "🔁",
    description: "Keep track of active subscriptions.",
    type: "database",
    schema: [
      { key: "cost", name: "Cost/Month", type: "number" },
      { key: "billingDate", name: "Billing Date", type: "date" },
      { key: "status", name: "Status", type: "status", options: ["Active", "Cancelled"] },
      { key: "category", name: "Category", type: "select", options: ["Streaming", "Software", "Gym", "Other"] }
    ]
  },
  {
    id: "budget-planner",
    category: "Finance",
    title: "Budget Planner",
    icon: "📊",
    description: "Plan monthly budgets by category.",
    type: "database",
    schema: [
      { key: "category", name: "Category", type: "text" },
      { key: "allocated", name: "Allocated", type: "number" },
      { key: "spent", name: "Spent", type: "number" },
      { key: "month", name: "Month", type: "text" }
    ]
  },
  {
    id: "savings-goals",
    category: "Finance",
    title: "Savings Goals",
    icon: "🏦",
    description: "Track progress towards savings.",
    type: "database",
    schema: [
      { key: "target", name: "Target Amount", type: "number" },
      { key: "current", name: "Current Saved", type: "number" },
      { key: "deadline", name: "Deadline", type: "date" },
      { key: "status", name: "Status", type: "status", options: ["Saving", "Reached", "On Hold"] }
    ]
  },
  {
    id: "invoice-tracker",
    category: "Finance",
    title: "Invoice Tracker",
    icon: "🧾",
    description: "Track sent and paid invoices.",
    type: "database",
    schema: [
      { key: "client", name: "Client", type: "text" },
      { key: "amount", name: "Amount", type: "number" },
      { key: "dueDate", name: "Due Date", type: "date" },
      { key: "status", name: "Status", type: "status", options: ["Draft", "Sent", "Paid", "Overdue"] }
    ]
  },
  {
    id: "investment-portfolio",
    category: "Finance",
    title: "Investment Portfolio",
    icon: "📈",
    description: "Track stocks and crypto.",
    type: "database",
    schema: [
      { key: "asset", name: "Asset Group", type: "select", options: ["Stock", "Crypto", "ETF", "Bonds"] },
      { key: "quantity", name: "Quantity", type: "number" },
      { key: "avgPrice", name: "Avg Buy Price", type: "number" }
    ]
  },
  {
    id: "debt-payoff",
    category: "Finance",
    title: "Debt Payoff",
    icon: "💳",
    description: "Track loans and credit card debt.",
    type: "database",
    schema: [
      { key: "type", name: "Type", type: "select", options: ["Credit Card", "Student Loan", "Mortgage", "Personal Loan"] },
      { key: "total", name: "Total Amount", type: "number" },
      { key: "remaining", name: "Remaining", type: "number" },
      { key: "apr", name: "APR %", type: "number" }
    ]
  },

  // HEALTH & FITNESS
  {
    id: "meal-planner",
    category: "Health & Fitness",
    title: "Meal Planner",
    icon: "🥗",
    description: "Plan breakfast, lunch, and dinner.",
    type: "database",
    schema: [
      { key: "day", name: "Day", type: "select", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
      { key: "meal", name: "Meal", type: "select", options: ["Breakfast", "Lunch", "Dinner", "Snack"] },
      { key: "recipe", name: "Recipe", type: "text" }
    ]
  },
  {
    id: "sleep-tracker",
    category: "Health & Fitness",
    title: "Sleep Tracker",
    icon: "💤",
    description: "Log sleep hours and quality.",
    type: "database",
    schema: [
      { key: "date", name: "Date", type: "date" },
      { key: "hours", name: "Hours Slept", type: "number" },
      { key: "quality", name: "Quality", type: "select", options: ["Great", "Good", "Fair", "Poor"] }
    ]
  },
  {
    id: "water-tracker",
    category: "Health & Fitness",
    title: "Water Tracker",
    icon: "💧",
    description: "Ensure you drink enough water.",
    type: "database",
    schema: [
      { key: "date", name: "Date", type: "date" },
      { key: "glasses", name: "Glasses (250ml)", type: "number" },
      { key: "goalReached", name: "Goal Reached", type: "checkbox" }
    ]
  },
  {
    id: "medication-log",
    category: "Health & Fitness",
    title: "Medication Log",
    icon: "💊",
    description: "Track medicine intake.",
    type: "database",
    schema: [
      { key: "med", name: "Medication", type: "text" },
      { key: "dose", name: "Dosage", type: "text" },
      { key: "time", name: "Time", type: "text" },
      { key: "taken", name: "Taken Today", type: "checkbox" }
    ]
  },
  {
    id: "symptom-tracker",
    category: "Health & Fitness",
    title: "Symptom Tracker",
    icon: "🤒",
    description: "Log physical symptoms.",
    type: "database",
    schema: [
      { key: "date", name: "Date", type: "date" },
      { key: "symptom", name: "Symptom", type: "text" },
      { key: "severity", name: "Severity (1-10)", type: "number" }
    ]
  },
  {
    id: "doctor-visits",
    category: "Health & Fitness",
    title: "Doctor Visits",
    icon: "🩺",
    description: "Log doctor appointments.",
    type: "database",
    schema: [
      { key: "doctor", name: "Doctor/Specialty", type: "text" },
      { key: "date", name: "Date", type: "date" },
      { key: "reason", name: "Reason", type: "text" },
      { key: "followUp", name: "Follow Up Needed", type: "checkbox" }
    ]
  },
  {
    id: "running-log",
    category: "Health & Fitness",
    title: "Running Log",
    icon: "🏃",
    description: "Track distance and pace.",
    type: "database",
    schema: [
      { key: "date", name: "Date", type: "date" },
      { key: "distance", name: "Distance (km/mi)", type: "number" },
      { key: "time", name: "Time (mins)", type: "number" },
      { key: "pace", name: "Avg Pace", type: "text" }
    ]
  },

  // CREATIVE
  {
    id: "blog-post-draft",
    category: "Creative",
    title: "Blog Post Draft",
    icon: "✍️",
    description: "Draft your next article.",
    type: "document",
    blocks: [
      { type: "h1", text: "Title Ideas" },
      { type: "list", text: "Idea 1..." },
      { type: "h2", text: "Outline" },
      { type: "h3", text: "Introduction" },
      { type: "p", text: "Hook the reader..." },
      { type: "h3", text: "Body Paragraphs" },
      { type: "p", text: "..." },
      { type: "h3", text: "Conclusion" },
      { type: "p", text: "..." }
    ]
  },
  {
    id: "idea-journal",
    category: "Creative",
    title: "Idea Journal",
    icon: "💡",
    description: "Capture random ideas and brain dumps.",
    type: "database",
    schema: [
      { key: "type", name: "Type", type: "select", options: ["App Idea", "Writing", "Art", "Business", "Other"] },
      { key: "status", name: "Status", type: "status", options: ["New", "Developing", "Archived"] },
      { key: "date", name: "Date captured", type: "date" }
    ]
  },
  {
    id: "character-profile",
    category: "Creative",
    title: "Character Profile",
    icon: "🎭",
    description: "For writers and world-builders.",
    type: "document",
    blocks: [
      { type: "h1", text: "Character Name" },
      { type: "h2", text: "Basic Info" },
      { type: "p", text: "Age: \\nOccupation: \\nLocation: " },
      { type: "h2", text: "Personality" },
      { type: "p", text: "Strengths: \\nWeaknesses: " },
      { type: "h2", text: "Backstory" },
      { type: "p", text: "..." }
    ]
  },
  {
    id: "social-media-planner",
    category: "Creative",
    title: "Social Media Planner",
    icon: "📱",
    description: "Plan posts across platforms.",
    type: "database",
    schema: [
      { key: "platform", name: "Platform", type: "select", options: ["Instagram", "Twitter/X", "TikTok", "YouTube"] },
      { key: "status", name: "Status", type: "status", options: ["Idea", "Filming", "Editing", "Ready", "Posted"] },
      { key: "date", name: "Post Date", type: "date" }
    ]
  },
  {
    id: "music-practice",
    category: "Creative",
    title: "Music Practice Log",
    icon: "🎸",
    description: "Track instrumental practice.",
    type: "database",
    schema: [
      { key: "instrument", name: "Instrument", type: "text" },
      { key: "duration", name: "Duration (mins)", type: "number" },
      { key: "focus", name: "Focus Area", type: "select", options: ["Scales", "Repertoire", "Sight Reading", "Theory"] }
    ]
  },
  {
    id: "design-system",
    category: "Creative",
    title: "Design System Elements",
    icon: "🎨",
    description: "Keep track of design assets.",
    type: "database",
    schema: [
      { key: "type", name: "Asset Type", type: "select", options: ["Color", "Font", "Icon", "Component"] },
      { key: "hex", name: "Hex Code", type: "text" },
      { key: "status", name: "Status", type: "status", options: ["Draft", "Approved", "Deprecated"] }
    ]
  },
  {
    id: "photo-locations",
    category: "Creative",
    title: "Photo Hubs",
    icon: "📸",
    description: "Scouting locations for photography.",
    type: "database",
    schema: [
      { key: "location", name: "Location", type: "text" },
      { key: "vibe", name: "Vibe", type: "select", options: ["Urban", "Nature", "Studio", "Architecture"] },
      { key: "visited", name: "Visited", type: "checkbox" }
    ]
  },
  
  // REAL ESTATE / HOME
  {
    id: "home-maintenance",
    category: "Real Estate & Home",
    title: "Home Maintenance",
    icon: "🔨",
    description: "Track house repairs.",
    type: "database",
    schema: [
      { key: "area", name: "Area", type: "select", options: ["HVAC", "Plumbing", "Roof", "Lawn", "Interior"] },
      { key: "lastService", name: "Last Serviced", type: "date" },
      { key: "nextService", name: "Next Service", type: "date" }
    ]
  },
  {
    id: "apartment-hunting",
    category: "Real Estate & Home",
    title: "Apartment Hunting",
    icon: "🏢",
    description: "Compare apartments.",
    type: "database",
    schema: [
      { key: "rent", name: "Rent Price", type: "number" },
      { key: "beds", name: "Beds/Baths", type: "text" },
      { key: "status", name: "Status", type: "status", options: ["Viewed", "Applied", "Rejected", "Interested"] },
      { key: "rating", name: "Rating", type: "select", options: ["⭐️⭐️⭐️⭐️⭐️", "⭐️⭐️⭐️", "⭐️"] }
    ]
  },
  {
    id: "inventory",
    category: "Real Estate & Home",
    title: "Home Inventory",
    icon: "📦",
    description: "Track valuables for insurance.",
    type: "database",
    schema: [
      { key: "item", name: "Item", type: "text" },
      { key: "value", name: "Est Value", type: "number" },
      { key: "room", name: "Room", type: "text" },
      { key: "serial", name: "Serial Number", type: "text" }
    ]
  },
  
  // MISC
  {
    id: "gift-ideas",
    category: "Misc",
    title: "Gift Ideas",
    icon: "🎁",
    description: "Track gifts for friends and family.",
    type: "database",
    schema: [
      { key: "person", name: "Person", type: "text" },
      { key: "idea", name: "Idea", type: "text" },
      { key: "price", name: "Price", type: "number" },
      { key: "status", name: "Status", type: "status", options: ["Idea", "Purchased", "Wrapped", "Given"] }
    ]
  },
  {
    id: "collection-tracker",
    category: "Misc",
    title: "Collection Tracker",
    icon: "💎",
    description: "Track stamps, coins, cards, etc.",
    type: "database",
    schema: [
      { key: "item", name: "Item Name", type: "text" },
      { key: "condition", name: "Condition", type: "select", options: ["Mint", "Excellent", "Good", "Poor"] },
      { key: "value", name: "Est Value", type: "number" },
      { key: "year", name: "Year", type: "number" }
    ]
  },
  {
    id: "software-licenses",
    category: "Misc",
    title: "Software Licenses",
    icon: "🔑",
    description: "Track app licenses and keys.",
    type: "database",
    schema: [
      { key: "software", name: "Software Name", type: "text" },
      { key: "licenseKey", name: "License Key", type: "text" },
      { key: "expiration", name: "Expiratioin Date", type: "date" }
    ]
  },
];
