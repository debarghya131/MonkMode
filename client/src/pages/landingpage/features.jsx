import { useState } from "react";
import { motion as Motion } from "framer-motion";
import AuthBackground from "../authentication/AuthBackground";
import LandingNavbar from "./LandingNavbar";
import overviewPic1 from "../../assets/overview/overviewpic1.webp";
import overviewPic2 from "../../assets/overview/overviewpic2.webp";
import overviewPic3 from "../../assets/overview/overviewpic3.webp";
import overviewPic4 from "../../assets/overview/overviewpic4.webp";
import overviewPic5 from "../../assets/overview/overviewpic5.webp";
import overviewPic6 from "../../assets/overview/overviewpic6.webp";
import overviewPic7 from "../../assets/overview/overviewpic7.webp";
import overviewPic8 from "../../assets/overview/overviewpic8.webp";
import overviewPic9 from "../../assets/overview/overviewpic9.webp";
import overviewPic10 from "../../assets/overview/overviewpic10.webp";
import journalPic1 from "../../assets/journal/journalpic1.webp";
import journalPic2 from "../../assets/journal/journalpic2.webp";
import journalPic3 from "../../assets/journal/journalpic3.webp";
import journalPic4 from "../../assets/journal/journalpic4.webp";
import journalPic5 from "../../assets/journal/journalpic5.webp";
import journalPic6 from "../../assets/journal/journalpic6.webp";
import journalPic7 from "../../assets/journal/journalpic7.webp";
import journalPic8 from "../../assets/journal/journalpic8.webp";
import journalPic9 from "../../assets/journal/journalpic9.webp";
import journalPic10 from "../../assets/journal/journalpic10.webp";
import journalPic11 from "../../assets/journal/journalpic11.webp";
import journalPic12 from "../../assets/journal/journalpic12.webp";
import journalPic13 from "../../assets/journal/journalpic13.webp";
import journalPic14 from "../../assets/journal/journalpic14.webp";
import journalPic15 from "../../assets/journal/journalpic15.webp";
import journalPic16 from "../../assets/journal/journalpic16.webp";
import todoPic1 from "../../assets/todo/todopic1.webp";
import todoPic2 from "../../assets/todo/todopic2.webp";
import todoPic3 from "../../assets/todo/todopic3.webp";
import todoPic4 from "../../assets/todo/todopic4.webp";
import todoPic5 from "../../assets/todo/todopic5.webp";
import todoPic6 from "../../assets/todo/todopic6.webp";
import todoPic7 from "../../assets/todo/todopic7.webp";
import todoPic8 from "../../assets/todo/todopic8.webp";
import todoPic9 from "../../assets/todo/todopic9.webp";
import todoPic10 from "../../assets/todo/todopic10.webp";
import todoPic11 from "../../assets/todo/todopic11.webp";
import todoPic12 from "../../assets/todo/todopic12.webp";
import todoPic13 from "../../assets/todo/todopic13.webp";
import todoPic14 from "../../assets/todo/todopic14.webp";
import habitPic1 from "../../assets/habit/habitpic1.webp";
import habitPic2 from "../../assets/habit/habitpic2.webp";
import habitPic3 from "../../assets/habit/habitpic3.webp";
import habitPic4 from "../../assets/habit/habitpic4.webp";
import habitPic5 from "../../assets/habit/habitpic5.webp";
import habitPic6 from "../../assets/habit/habitpic6.webp";
import habitPic7 from "../../assets/habit/habitpic7.webp";
import habitPic8 from "../../assets/habit/habitpic8.webp";
import habitPic9 from "../../assets/habit/habitpic9.webp";
import habitPic10 from "../../assets/habit/habitpic10.webp";
import habitPic11 from "../../assets/habit/habitpic11.webp";
import habitPic12 from "../../assets/habit/habitpic12.webp";
import goalPic1 from "../../assets/goal/goalpic1.webp";
import goalPic2 from "../../assets/goal/goalpic2.webp";
import goalPic3 from "../../assets/goal/goalpic3.webp";
import goalPic4 from "../../assets/goal/goalpic4.webp";
import goalPic5 from "../../assets/goal/goalpic5.webp";
import goalPic6 from "../../assets/goal/goalpic6.webp";
import goalPic7 from "../../assets/goal/goalpic7.webp";
import goalPic8 from "../../assets/goal/goalpic8.webp";
import goalPic9 from "../../assets/goal/goalpic9.webp";
import goalPic10 from "../../assets/goal/goalpic10.webp";
import gymPic1 from "../../assets/gym/gympic1.webp";
import gymPic2 from "../../assets/gym/gympic2.webp";
import gymPic3 from "../../assets/gym/gympic3.webp";
import gymPic4 from "../../assets/gym/gympic4.webp";
import gymPic5 from "../../assets/gym/gympic5.webp";
import gymPic6 from "../../assets/gym/gympic6.webp";
import gymPic7 from "../../assets/gym/gympic7.webp";
import gymPic8 from "../../assets/gym/gympic8.webp";
import gymPic9 from "../../assets/gym/gympic9.webp";
import gymPic10 from "../../assets/gym/gympic10.webp";
import gymPic11 from "../../assets/gym/gympic11.webp";
import gymPic12 from "../../assets/gym/gympic12.webp";
import gymPic13 from "../../assets/gym/gympic13.webp";
import gymPic14 from "../../assets/gym/gympic14.webp";
import gymPic15 from "../../assets/gym/gympic15.webp";
import gymPic16 from "../../assets/gym/gympic16.webp";
import gymPic17 from "../../assets/gym/gympic17.webp";
import gymPic18 from "../../assets/gym/gympic18.webp";
import gymPic19 from "../../assets/gym/gympic19.webp";
import gymPic20 from "../../assets/gym/gympic20.webp";
import gymPic21 from "../../assets/gym/gympic21.webp";
import gymPic22 from "../../assets/gym/gympic22.webp";
import gymPic23 from "../../assets/gym/gympic23.webp";
import gymPic24 from "../../assets/gym/gympic24.webp";
import weeklyReportPic1 from "../../assets/weeklyreport/weeklyreportpic1.webp";
import weeklyReportPic2 from "../../assets/weeklyreport/weeklyreportpic2.webp";
import weeklyReportPic3 from "../../assets/weeklyreport/weeklyreportpic3.webp";
import weeklyReportPic4 from "../../assets/weeklyreport/weeklyreportpic4.webp";
import weeklyReportPic5 from "../../assets/weeklyreport/weeklyreportpic5.webp";
import weeklyReportPic6 from "../../assets/weeklyreport/weeklyreportpic6.webp";
import weeklyReportPic7 from "../../assets/weeklyreport/weeklyreportpic7.webp";
import weeklyReportPic8 from "../../assets/weeklyreport/weeklyreportpic8.webp";
import analysisPic1 from "../../assets/analysis/analysispic1.webp";
import analysisPic2 from "../../assets/analysis/analysispic2.webp";
import analysisPic3 from "../../assets/analysis/analysispic3.webp";
import analysisPic4 from "../../assets/analysis/analysispic4.webp";
import analysisPic5 from "../../assets/analysis/analysispic5.webp";
import analysisPic6 from "../../assets/analysis/analysispic6.webp";
import aiGuruPic1 from "../../assets/aiguru/aigurupic1.webp";
import aiGuruPic2 from "../../assets/aiguru/aigurupic2.webp";
import aiGuruPic3 from "../../assets/aiguru/aigurupic3.webp";
import aiGuruPic4 from "../../assets/aiguru/aigurupic4.webp";
import aiGuruPic5 from "../../assets/aiguru/aigurupic5.webp";

const overviewSlides = [
  {
    image: overviewPic4,
    title: "Overview Dashboard",
    text: "This screen is the main overview dashboard. It combines today's journal, tasks, habits, goals, gym status, and yearly activity heatmaps so the user can understand their complete discipline system in one place.",
  },
  {
    image: overviewPic1,
    title: "Try Demo Button",
    text: "This button allows visitors to enter demo mode and explore MonkMode without creating an account. It is a quick entry point for testing the dashboard experience.",
  },
  {
    image: overviewPic2,
    title: "Demo Entry Page",
    text: "This screen explains demo mode before entering the dashboard. It tells users they can browse habits, goals, journal, gym, analytics, and reports while create, edit, and save actions stay disabled.",
  },
  {
    image: overviewPic3,
    title: "Focus State Loader",
    text: "This transition screen appears while MonkMode opens the dashboard. It creates a focused entry experience with a progress bar and a calm visual mood before the user starts working.",
  },
  {
    image: overviewPic5,
    title: "Today’s Discipline Cards",
    text: "This section summarizes today's discipline across journal, tasks, habits, goals, and gym. Each card shows key counts and quick actions so the user can jump directly into the area that needs attention.",
  },
  {
    image: overviewPic6,
    title: "Activity Heatmaps",
    text: "This screen shows yearly contribution heatmaps for journal, todo, habit, goal, and gym activity. It helps users see consistency patterns across months instead of only checking one day at a time.",
  },
  {
    image: overviewPic7,
    title: "Dashboard Navigation",
    text: "This sidebar is the main navigation for MonkMode. It gives access to Overview, Journal, To-Do List, Habits, Goals, Gym, Weekly Report, Analysis, and AI Guru from one organized menu.",
  },
  {
    image: overviewPic8,
    title: "Monk Streak Rules",
    text: "This tooltip explains how the Monk Streak works. To protect the streak, users must submit the journal, complete every task without missed tasks, and complete every habit for the day.",
  },
  {
    image: overviewPic9,
    title: "Consistency Score",
    text: "This tooltip explains how the consistency score is calculated. It uses journal, todo, and habit completion so the user can understand why their daily discipline percentage changes.",
  },
  {
    image: overviewPic10,
    title: "Monk Level System",
    text: "This tooltip describes the Monk Level journey. Users progress from Beginner to Starter, Consistent, Disciplined, Discipline God, Warrior, Legend, and Monk as their streak grows.",
  },
];

const journalSlides = [
  {
    image: journalPic1,
    title: "Mood Selection",
    text: "This is the first journal step where the user chooses how they are feeling. Mood options like motivated, happy, calm, focused, tired, grateful, peaceful, and more help turn emotion into trackable daily data.",
  },
  {
    image: journalPic2,
    title: "Daily Summary",
    text: "This step asks what happened today. It gives the user a large writing area for a short factual summary, helping them capture the day without overthinking.",
  },
  {
    image: journalPic3,
    title: "Biggest Distraction",
    text: "This journal step records the biggest distraction of the day. By naming the thing that pulled attention away, the user can understand what repeatedly breaks focus.",
  },
  {
    image: journalPic4,
    title: "Overall Day Rating",
    text: "This screen lets the user rate the full day from 1 to 100. The score becomes a simple daily signal that can later be compared with mood, energy, sleep, wins, and mistakes.",
  },
  {
    image: journalPic5,
    title: "Custom Journal Field",
    text: "Users can add a custom journal field when they want to track something personal. The custom field includes a title, optional description, and answer box for flexible reflection.",
  },
  {
    image: journalPic6,
    title: "Day Logged Confirmation",
    text: "After the journal is submitted, this confirmation screen shows that the day has been logged. The user can view the journal or edit today's entry until midnight.",
  },
  {
    image: journalPic7,
    title: "Journal Entry Detail",
    text: "This modal shows a saved journal entry in detail, including mood, wake-up time, energy level, summary, wins, mistakes, lesson of the day, and other reflection fields.",
  },
  {
    image: journalPic8,
    title: "Past Entries",
    text: "The past entries panel lists previous journal days with mood, wake-up time, energy, rating, wins, and a preview of the summary so the user can quickly revisit older reflections.",
  },
  {
    image: journalPic9,
    title: "Journal Heatmap",
    text: "This heatmap shows journal contribution across the year. It helps users see how consistently they are reflecting and where gaps appear across months.",
  },
  {
    image: journalPic10,
    title: "Missed Days",
    text: "This card tracks missed journal days in the selected week. The user can add a reason for missing a day, keeping the system honest without hiding inconsistency.",
  },
  {
    image: journalPic11,
    title: "Journal Consistency",
    text: "This badge summarizes journal consistency, including the current consistency percentage and lifetime logged count. It gives quick feedback on reflection discipline.",
  },
  {
    image: journalPic12,
    title: "Journal Streak Stat",
    text: "This compact stat shows how many days the journal has been maintained. It keeps the streak visible so the user remembers that reflection is part of daily discipline.",
  },
  {
    image: journalPic13,
    title: "Weekly Journal Summary",
    text: "This weekly summary reviews logged days, top mood, weekly score, longest streak, energy, day rating, wins, mistakes, achievements, missed days, and Little Monk's AI analysis.",
  },
  {
    image: journalPic14,
    title: "Mood Analysis",
    text: "The mood analysis page compares mood with energy and overall day rating. It also shows mood distribution and AI summary cards for frequent mood, strongest day pattern, and energy dips.",
  },
  {
    image: journalPic15,
    title: "Sleep And Energy Analysis",
    text: "This analysis page shows sleep duration trends, sleep versus energy and day rating, average sleep duration, wake-up time, sleep time, monthly energy, and highest or lowest rated days.",
  },
  {
    image: journalPic16,
    title: "Wins, Mistakes And Streaks",
    text: "This analytics tab tracks wins, mistakes, achievements, repeated mistakes, repeated distractions, weekly score, and streak behavior so the user can understand deeper reflection patterns.",
  },
];

const todoSlides = [
  {
    image: todoPic1,
    title: "Today's Tasks",
    text: "This screen organizes today's tasks into all, pending, completed, and missed groups. The right overview card shows total, pending, completed, and missed counts so the user can see the day clearly.",
  },
  {
    image: todoPic2,
    title: "Upcoming Schedule",
    text: "The upcoming view shows tomorrow's tasks and the next five days in a calendar-like schedule. It helps the user prepare ahead instead of only reacting to today's work.",
  },
  {
    image: todoPic3,
    title: "Missed Tasks",
    text: "This panel lists tasks that slipped past their expected time. Users can mark them complete later, making missed work visible instead of silently disappearing.",
  },
  {
    image: todoPic4,
    title: "Create And Manage Tasks",
    text: "The task creation page lets users add title, description, category, priority, repeat pattern, time, start date, and end behavior. It also shows active and archived tasks with calendar logs.",
  },
  {
    image: todoPic5,
    title: "Task Logs",
    text: "Task logs record important changes such as created, edited, deleted, or ended tasks. This gives users a small history of what happened inside their todo system.",
  },
  {
    image: todoPic6,
    title: "Important Tasks",
    text: "The important page focuses on high-priority tasks and important categories. It separates default and custom starred categories so important work stays easy to find.",
  },
  {
    image: todoPic7,
    title: "Todo Heatmap",
    text: "The todo heatmap shows task activity across the year. It gives a visual record of consistency and helps users notice months where execution was strong or weak.",
  },
  {
    image: todoPic8,
    title: "Todo Consistency",
    text: "This consistency badge summarizes today's completed tasks and lifetime task completion. It gives quick feedback on how reliable the user's todo execution has been.",
  },
  {
    image: todoPic9,
    title: "Todo Streak Stat",
    text: "This compact stat shows the current todo streak in days. It keeps the task streak visible and encourages users to maintain daily completion.",
  },
  {
    image: todoPic10,
    title: "Overview Todo Card",
    text: "This small overview card summarizes today's tasks with completed, pending, missed, and important task counts. It gives a quick todo snapshot from the main dashboard.",
  },
  {
    image: todoPic11,
    title: "Weekly Todo Summary",
    text: "The weekly report summarizes completion rate, miss rate, longest streak, consistency, score, active days, AI analysis, priority performance, daily breakdown, timing, and category performance.",
  },
  {
    image: todoPic12,
    title: "Completion And Miss Analysis",
    text: "This analysis view compares completion and missed rates by day and time slot. It helps users understand when they complete tasks best and when tasks are most often missed.",
  },
  {
    image: todoPic13,
    title: "Category And Priority Analysis",
    text: "This screen analyzes task completion and misses by category and priority. It highlights strong and weak categories, late completions, and procrastination patterns.",
  },
  {
    image: todoPic14,
    title: "Score And Streak Analysis",
    text: "This analysis tab tracks streak breaks, consistency scores, highest and lowest consistent days, weekly score, and streak behavior across the month.",
  },
];

const habitSlides = [
  {
    image: habitPic1,
    title: "Today's Habits Board",
    text: "This screen organizes the full habit day into all habits, pending habits, completed habits, and streak summary. The user can filter by time of day or priority, mark pending habits done, undo completed habits, and see streak health in one focused view.",
  },
  {
    image: habitPic2,
    title: "Habit Streak Summary",
    text: "The streak summary panel shows every habit with target streak, current streak, max streak, end date, days left, and number of streak breaks. It helps the user understand which routines are stable and which ones need more attention.",
  },
  {
    image: habitPic3,
    title: "Create And Manage Habits",
    text: "This page lets users build new habits with name, purpose, target streak, time of day, category, priority, repeat pattern, and time. It also shows active habits, archived habits, the calendar, and habit logs for edits, creates, and deletes.",
  },
  {
    image: habitPic4,
    title: "Monthly Habit Tracker",
    text: "The tracker shows each active habit across the selected month. Every day becomes a small check cell, with streak badges, target labels, days-left tags, and important markers so consistency can be reviewed habit by habit.",
  },
  {
    image: habitPic5,
    title: "Habit Heatmap",
    text: "This compact yearly heatmap shows habit contributions across months. It gives a quick visual signal of long-term routine consistency and makes empty periods easy to notice.",
  },
  {
    image: habitPic6,
    title: "Habit Streak Stat",
    text: "This dashboard stat keeps the current habit streak visible. It gives the user a fast reminder of how many days their habit discipline has stayed active.",
  },
  {
    image: habitPic7,
    title: "Habit Consistency Score",
    text: "The consistency badge summarizes today's habit completion and lifetime completion. It turns habit execution into a simple percentage so the user can understand progress at a glance.",
  },
  {
    image: habitPic8,
    title: "Overview Habit Card",
    text: "This overview card gives a small snapshot of today's habits, including completed and pending counts. The Track Your Habit action helps the user jump directly from the dashboard into the habit section.",
  },
  {
    image: habitPic9,
    title: "Weekly Habit Report",
    text: "The weekly report shows scheduled habits, maintained streaks, broken streaks, longest streak, consistency, score, daily breakdown, habit performance, category performance, and Little Monk's AI analysis for the selected week.",
  },
  {
    image: habitPic10,
    title: "Completion And Miss Analysis",
    text: "This analytics tab compares completion and miss rate by day and by active habit. It highlights total active habits, monthly completion rate, miss rate, best habit, and most missed habit.",
  },
  {
    image: habitPic11,
    title: "Category And Time Analysis",
    text: "This view studies habit performance by category and time of day. It points out best and worst categories, best time in the day, and weak time periods where habits are missed more often.",
  },
  {
    image: habitPic12,
    title: "Streak And Score Analysis",
    text: "The streak and score tab tracks average streak length, streak breaks, maintained habits, weekly score, consistency score, best consistent day, and longer-term habit streak behavior across the month.",
  },
];

const goalSlides = [
  {
    image: goalPic1,
    title: "All Goals",
    text: "This screen lists every active goal with type, deadline, days left, sub-goal progress, priority, and quick actions. Users can mark goals important, add sub-goals, or update progress without leaving the goal list.",
  },
  {
    image: goalPic2,
    title: "Add Sub-Goals",
    text: "The sub-goal modal helps break a large goal into smaller action points. It also links goal progress with habit creation, so long-term targets can become daily routines instead of staying vague.",
  },
  {
    image: goalPic3,
    title: "Update Progress",
    text: "This progress modal separates pending and completed sub-goals. Users can mark milestones as done, undo completed items, or remove sub-goals while seeing due dates and days left for each action.",
  },
  {
    image: goalPic4,
    title: "Create And Manage Goals",
    text: "The create goal page lets users add goal title, motivation, goal type, start date, deadline, and priority. It also shows active and archived goals with recent goal logs for created, updated, and archived activity.",
  },
  {
    image: goalPic5,
    title: "Goal Progress",
    text: "The progress page shows overall milestone completion across all goals and individual progress bars for each goal. It supports active, archived, and priority filters so the user can quickly find goals that need attention.",
  },
  {
    image: goalPic6,
    title: "Goal Heatmap",
    text: "This yearly heatmap records goal activity across months. It gives a long-term view of goal work and makes periods of strong or weak progress easy to notice.",
  },
  {
    image: goalPic7,
    title: "Overview Goal Card",
    text: "The dashboard goal card summarizes goals done and sub-goals completed. The View Progress action gives a fast route from the main overview into deeper goal tracking.",
  },
  {
    image: goalPic8,
    title: "Weekly Goal Report",
    text: "The weekly report reviews average progress, completed goals, pending sub-goals, sub-goals done this week, score, AI summary, risk indicators, and which goals are on track or behind schedule.",
  },
  {
    image: goalPic9,
    title: "Goal Progress Analysis",
    text: "This analytics tab charts sub-goal completion through the month and summarizes active goals, completed goals, active sub-goals, completed sub-goals, late completions, average progress, and most progressed goal.",
  },
  {
    image: goalPic10,
    title: "Consistency And Deadline Analysis",
    text: "This analysis view compares goal consistency, deadline pressure, progress, expected progress, weekly score, most consistent goal, least consistent goal, and goals that are behind schedule.",
  },
];

const gymSlides = [
  {
    image: gymPic1,
    title: "Today's Workout Board",
    text: "This screen shows the selected day workout plan with exercises, muscle groups, sets, reps, time, rest, total volume, and progress actions. Diet, supplements, pre/post workout, and macros are available from the right side panel.",
  },
  {
    image: gymPic2,
    title: "Exercise Progress Preview",
    text: "The progress preview compares the last session with today's performance for sets, reps, weight, time, rest, and notes. It helps the user understand what changed before updating a workout.",
  },
  {
    image: gymPic3,
    title: "Update Exercise Progress",
    text: "This modal records today's exercise result with sets done, reps per set, set breakdown, weight, total time, rest, total volume, and optional notes so workout progress is saved with useful detail.",
  },
  {
    image: gymPic4,
    title: "Full Day Diet",
    text: "The diet view shows meals by morning, breakfast, lunch, evening, and dinner with times. It keeps the user's daily eating plan connected to the workout day.",
  },
  {
    image: gymPic5,
    title: "Supplements",
    text: "This panel lists supplements with their timing for the selected day. It helps users keep intake consistent alongside training and nutrition.",
  },
  {
    image: gymPic6,
    title: "Pre And Post Workout",
    text: "The pre and post workout view separates food or supplements taken before training from recovery intake after training, making workout nutrition easier to follow.",
  },
  {
    image: gymPic7,
    title: "Macros",
    text: "This macro panel summarizes protein, carbs, fats, fiber, calories, water, sugar, and sodium for the day so the user can compare nutrition with workout performance.",
  },
  {
    image: gymPic8,
    title: "Workout Builder",
    text: "The builder lets users create workout plans with goal type, split, exercises, estimated time, days, start date, difficulty, and active status. It also shows saved workouts and detailed workout logs.",
  },
  {
    image: gymPic9,
    title: "Copy Workout",
    text: "This popup copies an existing workout to selected remaining days. It is useful when the user wants to reuse a plan across the week without rebuilding it manually.",
  },
  {
    image: gymPic10,
    title: "Activate Workout",
    text: "This control activates an inactive workout plan. It keeps workout management quick when switching plans back into the current schedule.",
  },
  {
    image: gymPic11,
    title: "Diet Chart Builder",
    text: "The diet chart builder creates meals, pre/post workout nutrition, supplements, and macro targets for selected days. It gives gym planning a full nutrition layer instead of only tracking exercise.",
  },
  {
    image: gymPic12,
    title: "Body Measurements",
    text: "This page records body measurements by check-in date and body section. It stores saved snapshots and check-in history so body changes can be compared over time.",
  },
  {
    image: gymPic13,
    title: "Measurement Progress",
    text: "The measurement progress view charts body weight and other measurements across check-ins. It also shows each check-in update with positive and negative changes for every tracked metric.",
  },
  {
    image: gymPic14,
    title: "Workout Progress Charts",
    text: "This progress page tracks exercise performance over sessions with charts for sets, reps, weight, and volume. Users can filter by exercise group and review strength movement over time.",
  },
  {
    image: gymPic15,
    title: "Exercise Library",
    text: "The workout library organizes exercises by body group such as chest, back, shoulders, arms, legs, core, lower back, neck, and tibialis. It gives users a reusable exercise database for building plans.",
  },
  {
    image: gymPic16,
    title: "Progress Photos",
    text: "The progress photo section stores body photos by check-in date and supports uploading and viewing images. It helps users compare visual progress alongside measurements and workout data.",
  },
  {
    image: gymPic17,
    title: "Photo Viewer",
    text: "The photo viewer opens progress photos in a larger modal with navigation, date labels, and thumbnails so the user can inspect body transformation images across check-ins.",
  },
  {
    image: gymPic18,
    title: "Gym Heatmap",
    text: "This yearly heatmap shows gym activity across months. It gives a quick visual record of workout consistency and highlights inactive periods.",
  },
  {
    image: gymPic19,
    title: "Overview Gym Card",
    text: "The dashboard gym card summarizes today's progress updates, checklist completion, pending checklist, last measurement check-in, and last uploaded photo with quick actions for deeper progress pages.",
  },
  {
    image: gymPic20,
    title: "Weekly Gym Report",
    text: "The weekly report summarizes average time, total volume lifted, consistency, weekly score, most trained muscles, AI analysis, strength progress, body progress, progress photos, and nutrition summary.",
  },
  {
    image: gymPic21,
    title: "Workout Performance Analysis",
    text: "This analytics tab shows body group distribution, day-wise performance, sessions, total volume, average duration, most frequent training day, best performance day, and weak performance day.",
  },
  {
    image: gymPic22,
    title: "Strength Progress Analysis",
    text: "The strength progress tab tracks an exercise with weight, reps, sets, and volume charts. It also summarizes sessions, weight gained, best volume session, average weight lifted, and latest session.",
  },
  {
    image: gymPic23,
    title: "Body Measurement Analysis",
    text: "This analysis view charts body measurements over time, compares first and latest check-ins, and highlights total check-ins, total weight lost, most changed measurement, tracking duration, and latest body weight.",
  },
  {
    image: gymPic24,
    title: "Nutrition And Consistency Analysis",
    text: "This tab analyzes average nutrition intake and day-wise consistency. It summarizes consistency score, weekly score, protein, calories, carbs, and other intake patterns connected to gym progress.",
  },
];

const weeklyReportSlides = [
  {
    image: weeklyReportPic1,
    title: "Weekly Report Entry",
    text: "This opening visual represents Little Monk's weekly review space. It gives the weekly report section a calm identity before the user moves into detailed summaries.",
  },
  {
    image: weeklyReportPic2,
    title: "Saved Weekly Summaries",
    text: "This panel lists previous weekly summaries with date ranges, logged days, and view controls. Users can switch between weeks and compare how their discipline changed over time.",
  },
  {
    image: weeklyReportPic3,
    title: "AI Weekly Analysis",
    text: "Little Monk's analysis turns weekly data into a readable insight. It highlights the strongest pattern, the missed day, the energy dip, and the next week's focus in plain language.",
  },
  {
    image: weeklyReportPic4,
    title: "Journal Weekly Report",
    text: "The journal report summarizes top mood, weekly score, longest streak, energy, day rating, wins, mistakes, achievements, missed days, and AI reflection for the selected week.",
  },
  {
    image: weeklyReportPic5,
    title: "Todo Weekly Report",
    text: "The todo report reviews completion rate, miss rate, longest streak, consistency, score, active days, priority performance, important categories, daily breakdown, timing, and category performance.",
  },
  {
    image: weeklyReportPic6,
    title: "Habit Weekly Report",
    text: "The habit report shows scheduled habits, maintained streaks, broken streaks, longest streak, consistency, score, daily breakdown, habit performance, category performance, and AI habit guidance.",
  },
  {
    image: weeklyReportPic7,
    title: "Goal Weekly Report",
    text: "The goal report tracks average progress, completed goals, pending sub-goals, sub-goals completed this week, score, goal progress, risk indicators, and behind-schedule goals.",
  },
  {
    image: weeklyReportPic8,
    title: "Gym Weekly Report",
    text: "The gym report summarizes workout days, average time, total volume lifted, consistency, weekly score, most trained muscles, strength progress, body progress, and nutrition summary.",
  },
];

const analysisSlides = [
  {
    image: analysisPic1,
    title: "Little Monk Summary",
    text: "This summary card turns analysis data into quick insight. It highlights the most frequent mood, strongest day pattern, and energy dip watch so users can act on patterns without reading every chart.",
  },
  {
    image: analysisPic2,
    title: "Journal Analysis",
    text: "Journal analysis compares mood with energy and overall day rating, tracks day-wise mood, and shows mood distribution. It helps users understand how emotions, energy, and daily rating connect.",
  },
  {
    image: analysisPic3,
    title: "Todo Analysis",
    text: "Todo analysis reviews completion, missed rate, time slots, best day, worst day, and best performance time. It shows where task execution is strong and where work is slipping.",
  },
  {
    image: analysisPic4,
    title: "Habit Analysis",
    text: "Habit analysis compares completion and miss rate for each active habit. It identifies total active habits, monthly completion, miss rate, highest completion habit, and most missed habit.",
  },
  {
    image: analysisPic5,
    title: "Goal Analysis",
    text: "Goal analysis tracks sub-goal completion over the month and summarizes active goals, completed goals, active sub-goals, completed sub-goals, late completions, average progress, and the most progressed goal.",
  },
  {
    image: analysisPic6,
    title: "Gym Analysis",
    text: "Gym analysis studies workout performance with body group distribution, day-wise training volume, monthly sessions, total volume lifted, average session duration, frequent training day, and best or weakest performance day.",
  },
];

const aiGuruSlides = [
  {
    image: aiGuruPic1,
    title: "Ming Character",
    text: "This visual introduces Ming as MonkMode's discipline guide. The calm monk identity makes the AI section feel personal, focused, and connected to the app's self-improvement theme.",
  },
  {
    image: aiGuruPic2,
    title: "Ask Ming Default Screen",
    text: "The AI Guru home screen introduces Ming with Namo Buddhaya, a short purpose statement, and the Ask Ming action. It makes the assistant feel like a personal discipline companion rather than a generic chat box.",
  },
  {
    image: aiGuruPic3,
    title: "Insights And Time Filters",
    text: "The Insights area lets users switch between insights and Ask Ming, then filter guidance by 7 days, 30 days, or all time. It gives the AI context windows for short-term and long-term reflection.",
  },
  {
    image: aiGuruPic4,
    title: "Discipline Co-Pilot Chat",
    text: "The chat screen gives users suggested prompts for deep work, missed task recovery, habit consistency, and gym planning. Ming responds inside a focused assistant panel built around goals, habits, mindset, and daily practice.",
  },
  {
    image: aiGuruPic5,
    title: "Ask Ming Input",
    text: "The message bar lets users ask Ming about their discipline system. It supports typed questions and a clear send action so users can turn their own data into practical guidance.",
  },
];

const features = [
  {
    title: "Overview",
    label: "01",
    text: "See your day, progress, pending actions, and important signals in one focused view.",
  },
  {
    title: "Journal",
    label: "02",
    text: "Record mood, sleep, wins, mistakes, achievements, and the lessons behind each day.",
  },
  {
    title: "Todo",
    label: "03",
    text: "Plan daily tasks, organize priorities, and keep execution clear from morning to night.",
  },
  {
    title: "Habit",
    label: "04",
    text: "Build daily routines, track completions, and understand where your discipline is growing.",
  },
  {
    title: "Goal",
    label: "05",
    text: "Break long-term ambitions into measurable progress updates and practical next steps.",
  },
  {
    title: "GYM",
    label: "06",
    text: "Track workouts, diet plans, measurements, progress photos, and exercise performance.",
  },
  {
    title: "Weekly Report",
    label: "07",
    text: "Review each week with summaries that show what improved and what needs attention.",
  },
  {
    title: "Analysis",
    label: "08",
    text: "Study patterns across habits, goals, journal, todo, and gym activity with visual analysis.",
  },
  {
    title: "AI Guru",
    label: "09",
    text: "Use Ming as a calm discipline companion for reflection, planning, and focused guidance.",
  },
];

function OverviewSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) => (current === 0 ? overviewSlides.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current === overviewSlides.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={overviewSlides[activeSlide].image}
          alt={overviewSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous overview image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next overview image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {overviewSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {overviewSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show overview image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = overviewSlides[activeSlide];

  return (
    <>
      <OverviewSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
    </>
  );
}

function JournalSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) => (current === 0 ? journalSlides.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current === journalSlides.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={journalSlides[activeSlide].image}
          alt={journalSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous journal image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next journal image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {journalSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {journalSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show journal image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function JournalFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = journalSlides[activeSlide];

  return (
    <>
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
      <JournalSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
    </>
  );
}

function TodoSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) => (current === 0 ? todoSlides.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current === todoSlides.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={todoSlides[activeSlide].image}
          alt={todoSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous todo image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next todo image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {todoSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {todoSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show todo image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TodoFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = todoSlides[activeSlide];

  return (
    <>
      <TodoSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
    </>
  );
}

function HabitSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) => (current === 0 ? habitSlides.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current === habitSlides.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={habitSlides[activeSlide].image}
          alt={habitSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous habit image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next habit image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {habitSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {habitSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show habit image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = habitSlides[activeSlide];

  return (
    <>
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
      <HabitSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
    </>
  );
}

function GoalSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) => (current === 0 ? goalSlides.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current === goalSlides.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={goalSlides[activeSlide].image}
          alt={goalSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous goal image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next goal image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {goalSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {goalSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show goal image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GoalFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = goalSlides[activeSlide];

  return (
    <>
      <GoalSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
    </>
  );
}

function GymSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) => (current === 0 ? gymSlides.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current === gymSlides.length - 1 ? 0 : current + 1));
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={gymSlides[activeSlide].image}
          alt={gymSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous gym image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next gym image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {gymSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {gymSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show gym image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GymFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = gymSlides[activeSlide];

  return (
    <>
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
      <GymSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
    </>
  );
}

function WeeklyReportSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) =>
      current === 0 ? weeklyReportSlides.length - 1 : current - 1,
    );
  };

  const goToNext = () => {
    setActiveSlide((current) =>
      current === weeklyReportSlides.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={weeklyReportSlides[activeSlide].image}
          alt={weeklyReportSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous weekly report image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next weekly report image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {weeklyReportSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {weeklyReportSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show weekly report image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyReportFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = weeklyReportSlides[activeSlide];

  return (
    <>
      <WeeklyReportSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
    </>
  );
}

function AnalysisSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) =>
      current === 0 ? analysisSlides.length - 1 : current - 1,
    );
  };

  const goToNext = () => {
    setActiveSlide((current) =>
      current === analysisSlides.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={analysisSlides[activeSlide].image}
          alt={analysisSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous analysis image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next analysis image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {analysisSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {analysisSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show analysis image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalysisFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = analysisSlides[activeSlide];

  return (
    <>
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
      <AnalysisSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
    </>
  );
}

function AiGuruSlider({ activeSlide, setActiveSlide }) {
  const goToPrevious = () => {
    setActiveSlide((current) =>
      current === 0 ? aiGuruSlides.length - 1 : current - 1,
    );
  };

  const goToNext = () => {
    setActiveSlide((current) =>
      current === aiGuruSlides.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className="group/slider relative overflow-hidden rounded-[1.1rem] border border-amber-100/10 bg-black/25 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition duration-300 hover:-translate-y-1 hover:border-amber-200/25 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:rounded-[1.25rem] sm:p-3">
      <div className="relative overflow-hidden rounded-[1rem] border border-amber-100/10 bg-stone-950/70">
        <img
          src={aiGuruSlides[activeSlide].image}
          alt={aiGuruSlides[activeSlide].title}
          className="aspect-[16/10] w-full object-contain transition duration-500 group-hover/slider:scale-[1.015]"
        />
        <button
          type="button"
          onClick={goToPrevious}
          aria-label="Show previous AI Guru image"
          className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:left-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Show next AI Guru image"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-amber-100/20 bg-stone-950/70 text-base font-bold text-amber-100 shadow-lg shadow-black/30 transition hover:border-amber-200/45 hover:bg-amber-400/20 sm:right-3 sm:h-9 sm:w-9 sm:text-lg"
        >
          ›
        </button>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs font-semibold text-amber-100/70">
          {String(activeSlide + 1).padStart(2, "0")} / {aiGuruSlides.length}
        </p>
        <div className="flex flex-wrap justify-end gap-1.5">
          {aiGuruSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveSlide(index)}
              aria-label={`Show AI Guru image ${index + 1}`}
              className={`h-2 rounded-full transition ${
                activeSlide === index
                  ? "w-6 bg-amber-300"
                  : "w-2 bg-amber-100/25 hover:bg-amber-100/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AiGuruFeature({ feature }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = aiGuruSlides[activeSlide];

  return (
    <>
      <AiGuruSlider activeSlide={activeSlide} setActiveSlide={setActiveSlide} />
      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
          <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
            {feature.label}
          </p>
          <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-3xl">
            {feature.title}
          </h2>
        </div>
        <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-amber-200/60 sm:mt-5 sm:text-[0.68rem] sm:tracking-[0.24em]">
          {String(activeSlide + 1).padStart(2, "0")} · {slide.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base sm:leading-8">
          {slide.text}
        </p>
      </div>
    </>
  );
}

export default function Features() {
  return (
    <main className="auth-page relative min-h-dvh overflow-x-hidden text-white sm:min-h-screen">
      <div className="fixed inset-0">
        <AuthBackground />
      </div>

      <div className="relative z-10">
        <LandingNavbar />

        <section className="mx-auto w-full max-w-7xl px-3 pb-14 pt-5 sm:px-6 sm:pb-24 sm:pt-8 md:px-8">
          <div className="flex flex-col gap-3.5 sm:gap-4">
            {features.map((feature, index) => (
              <Motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, scale: 1.006 }}
                transition={{ duration: 0.42, delay: index * 0.04, ease: "easeOut" }}
                className={`relative overflow-hidden rounded-[1.35rem] border border-amber-100/10 bg-stone-950/42 p-4 shadow-[0_16px_46px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:border-amber-200/25 hover:bg-stone-950/55 hover:shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:rounded-[1.5rem] sm:p-6 ${
                  index === 0 ||
                  index === 1 ||
                  index === 2 ||
                  index === 3 ||
                  index === 4 ||
                  index === 5 ||
                  index === 6 ||
                  index === 7 ||
                  index === 8
                    ? "grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center"
                    : "grid gap-3 sm:grid-cols-[5rem_minmax(0,12rem)_minmax(0,1fr)] sm:items-center sm:gap-4"
                }`}
              >
                <Motion.div
                  className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl"
                  animate={{ opacity: [0.22, 0.5, 0.22], scale: [0.95, 1.1, 0.95] }}
                  transition={{
                    duration: 6 + (index % 3),
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <Motion.div
                  className="pointer-events-none absolute -bottom-28 right-8 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
                  animate={{ opacity: [0.14, 0.38, 0.14], x: [0, -18, 0] }}
                  transition={{
                    duration: 7 + (index % 2),
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <Motion.div
                  className="pointer-events-none absolute inset-y-0 left-[-35%] w-[18%] -skew-x-12 bg-amber-100/10 blur-xl"
                  animate={{ left: ["-35%", "120%"] }}
                  transition={{
                    duration: 4.2,
                    repeat: Infinity,
                    repeatDelay: 3.2 + index * 0.18,
                    ease: "easeInOut",
                  }}
                />
                {index === 0 ? (
                  <OverviewFeature feature={feature} />
                ) : index === 1 ? (
                  <JournalFeature feature={feature} />
                ) : index === 2 ? (
                  <TodoFeature feature={feature} />
                ) : index === 3 ? (
                  <HabitFeature feature={feature} />
                ) : index === 4 ? (
                  <GoalFeature feature={feature} />
                ) : index === 5 ? (
                  <GymFeature feature={feature} />
                ) : index === 6 ? (
                  <WeeklyReportFeature feature={feature} />
                ) : index === 7 ? (
                  <AnalysisFeature feature={feature} />
                ) : index === 8 ? (
                  <AiGuruFeature feature={feature} />
                ) : (
                  <>
                    <p className="font-heading text-2xl font-black text-amber-200/70 sm:text-4xl">
                      {feature.label}
                    </p>
                    <h2 className="font-heading text-[1.7rem] font-black text-amber-50 sm:text-2xl">
                      {feature.title}
                    </h2>
                    <p className="text-sm leading-6 text-stone-300 sm:leading-7">
                      {feature.text}
                    </p>
                  </>
                )}
              </Motion.article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
