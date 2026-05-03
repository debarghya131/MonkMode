export const INITIAL_TASKS = [
  // Study
  { id: "study-dsa",      title: "Revise Graph Algorithms",    category: "Study",          priority: "High",   status: "pending",   time: "07:30", note: "Finish BFS, DFS, and solve 3 medium questions." },
  { id: "study-os",       title: "Read OS Concepts",           category: "Study",          priority: "Medium", status: "pending",   time: "14:00", note: "Cover process scheduling and memory management." },
  { id: "study-mock",     title: "Take Mock Interview",        category: "Study",          priority: "High",   status: "missed",    time: "16:30", note: "45-min timed mock on LeetCode." },

  // Work
  { id: "team-sync",      title: "Frontend Team Sync",         category: "Work",           priority: "High",   status: "completed", time: "09:15", note: "Share progress on dashboard schedule module." },
  { id: "work-pr",        title: "Raise Pull Request",         category: "Work",           priority: "High",   status: "pending",   time: "11:00", note: "Submit today's feature branch for review." },
  { id: "work-docs",      title: "Update API Docs",            category: "Work",           priority: "Medium", status: "completed", time: "13:30", note: "Document the new /schedule endpoints." },
  { id: "work-deploy",    title: "Deploy to Staging",          category: "Work",           priority: "Medium", status: "pending",   time: "17:00", note: "Push latest build to staging environment." },

  // Fitness
  { id: "gym-session",    title: "Strength Workout",           category: "Fitness",        priority: "Medium", status: "pending",   time: "18:00", note: "45 minutes upper body and mobility cooldown." },
  { id: "gym-stretch",    title: "Morning Stretch",            category: "Fitness",        priority: "Low",    status: "completed", time: "06:30", note: "10-min full-body stretch to wake up." },
  { id: "gym-run",        title: "Evening Run",                category: "Fitness",        priority: "Medium", status: "pending",   time: "19:30", note: "3 km easy pace around the block." },

  // Health
  { id: "water-intake",   title: "Track Water Intake",         category: "Health",         priority: "Low",    status: "completed", time: "10:00", note: "Complete first 2 bottles before lunch." },
  { id: "health-sleep",   title: "Sleep by 11 PM",             category: "Health",         priority: "Medium", status: "pending",   time: "23:00", note: "No screens 30 min before bed." },
  { id: "health-vitamins",title: "Take Vitamins",              category: "Health",         priority: "Low",    status: "missed",    time: "08:00", note: "D3, B12, and Omega-3 with breakfast." },

  // Bill & Payment
  { id: "electricity-bill", title: "Pay Electricity Bill",    category: "Bill & Payment", priority: "High",   status: "missed",    time: "11:30", note: "Due today before late fee applies." },
  { id: "rent-transfer",  title: "Transfer Rent",              category: "Bill & Payment", priority: "High",   status: "completed", time: "09:00", note: "Monthly rent, landlord expects it by noon." },
  { id: "subscription",   title: "Cancel Unused Subscription", category: "Bill & Payment", priority: "Low",    status: "pending",   time: "15:00", note: "Cancel the streaming plan before auto-renewal." },

  // Personal
  { id: "call-home",      title: "Call Parents",               category: "Personal",       priority: "Medium", status: "pending",   time: "20:30", note: "Check in after dinner." },
  { id: "journal-entry",  title: "Write Journal Entry",        category: "Personal",       priority: "Low",    status: "pending",   time: "22:00", note: "Reflect on today's wins and blockers." },
  { id: "clean-desk",     title: "Clean Workspace",            category: "Personal",       priority: "Low",    status: "completed", time: "08:30", note: "Declutter desk before the workday starts." },

  // Shopping
  { id: "groceries",      title: "Order Groceries",            category: "Shopping",       priority: "Low",    status: "missed",    time: "13:00", note: "Milk, oats, bananas, and eggs." },
  { id: "buy-earphones",  title: "Buy Earphones",              category: "Shopping",       priority: "Medium", status: "pending",   time: "14:30", note: "Check deals on Amazon before purchasing." },
];
