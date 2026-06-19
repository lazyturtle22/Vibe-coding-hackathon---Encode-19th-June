# Vibe-coding-hackathon---Encode-19th-June
[CLAUDE PROMPT]
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


[NEW CLAUDE PROMPT MADE WITH RESPECT TO THE SOLVIMON]
Let's use forge-plain to scaffold "ForgeCRM"—a usage-based AI CRM engineered specifically to maximize monetization for B2B scaleups, tailored for the Solvimon commercial-viability track.

Tech Stack: Next.js (App Router), Tailwind CSS, Supabase.

Implement these highly optimized modules to highlight immediate business value:

1. LANGUAGE-DRIVEN MONETIZATION DASHBOARD (Solvimon Focus):
   - A command-bar focused UI allowing founders to query commercial data (e.g., typing "show expected revenue this month" displays metrics).
   - An analytics view mapping user conversion metrics directly to flexible, usage-based pricing tiers (simulating a Solvimon billing integration).

2. CONVERSION-OPTIMIZED REAL ESTATE CO-PILOT:
   - A sales workspace with a chat context simulator.
   - AI evaluates past successful interactions to auto-suggest optimal, high-converting messaging strategies to sales reps.
   - Accepting a suggestion auto-updates the lead pipeline status in the DB.

3. CUSTOMIZABLE SUPPORT & RETENTION AGENT:
   - An intake form for customer issues.
   - The AI triages, logs an automated report, and determines if it can solve the issue immediately (retaining the customer) or if it requires human escalation.

4. SOCIAL LISTENING LEAD FINDER:
   - A target-term lead scanner dashboard (e.g., tracking keywords like "Kingston property").
   - Includes custom notification alerts to ensure instantaneous reaction time to new buyer signals.

5. AI CONTENT & PITCH GENERATOR:
   - A content generation tool targeted at turning lookalike leads into paying accounts with custom outbound marketing text.

Focus heavily on clean modular code blocks so we can rapidly iterate using codeplain during the hackathon. Let's initiate the project structure.
