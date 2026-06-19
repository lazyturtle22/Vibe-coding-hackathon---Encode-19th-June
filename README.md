# Vibe-coding-hackathon---Encode-19th-June
Let's use forge-plain to build a modular, AI-native CRM system called "ModularAI-CRM" designed for high-speed customer acquisition and automated retention. 

Our timeframe is ultra-short (1.5 days), so generate highly modular, clean, and immediately executable Next.js (App Router), Tailwind CSS, and Supabase-ready code.

Implement the app with the following core modules:

1. ARCHITECTURE & UX FOUNDATION:
   - UI Strategy: Modern, minimalist dashboard utilizing a "language-driven UX" approach (e.g., natural language command bar/omni-search that allows users to navigate or trigger CRM tasks simply by typing phrases).
   - Tech Stack: Next.js, React, Tailwind CSS, Lucide Icons.

2. SALES ASSISTANT AGENT (Real Estate Focused):
   - Interactive chat workspace that acts as a property sales co-pilot.
   - It reads mock database/chat histories to train itself on "what worked before".
   - It provides recommended answers to customer queries based on past successful deals.
   - Include a sync mechanism: when an agent accepts a suggestion, the interaction logs automatically update the local database.

3. AUTO-MAINTENANCE & ESCALATION SYSTEM:
   - A customizable customer support problem-reporting form.
   - AI triages the problem before connecting to a human: it auto-generates a summarized ticket report and tries to solve it. If unsolvable, it flags the ticket status as "Escalate to Human".

4. AUTOMATIC LEAD FINDER (Social Listening Dashboard):
   - A central dashboard that simulates scanning external posts for search terms (e.g., "Kingston").
   - Filter leads by recency. Include an automated "Notify Me" trigger (simulated email/alert notification system).

5. MARKETING CONTENT MAKER:
   - A simple one-click modular generator that outputs promotional copy or social posts based on targeted customer data found inside the CRM.

Ensure all modules are scaffolded cleanly into independent components so a 4-person team can work on them simultaneously without merge conflicts. Let's begin scaffolding the project structure.
