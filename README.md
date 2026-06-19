# Vibe-coding-hackathon---Encode-19th-June
[CLAUDE PROMPT]
Act as a senior full-stack developer. I need you to scaffold a modular AI-native CRM system called "ModularAI-CRM" designed for high-speed customer acquisition and automated retention. 

Our timeframe is ultra-short (1.5 days), so generate highly modular, clean, immediately executable Next.js (App Router), Tailwind CSS, and Supabase-ready code.

Implement the application with the following core modules split into independent components so our 4-person team can work simultaneously without Git conflicts:

1. UX & UI FOUNDATION:
   - Layout: Modern, minimalist dashboard.
   - Core Feature: Implement a "language-driven UX" using a natural language command bar/omni-search that allows users to navigate the system or trigger CRM tasks simply by typing phrases.

2. SALES ASSISTANT AGENT (Real Estate Focused):
   - Create an interactive chat workspace acting as a property sales co-pilot.
   - It reads mock database records and chat histories to train itself on past successful interactions.
   - It automatically generates and suggests high-converting answers to customer queries based on what previously worked.
   - Include a sync mechanism: when an agent accepts an AI suggestion, the interaction updates the pipeline status in the local mock database.

3. AUTO-MAINTENANCE & ESCALATION SYSTEM:
   - Build a customizable customer support intake form for submitting service/maintenance issues.
   - The AI triages incoming submissions, logs an automated report, and determines if it can solve the issue immediately or if it requires human escalation. If unsolvable by AI, it switches the ticket status to "Escalate to Human".

4. AUTOMATIC LEAD FINDER:
   - Design a central social listening dashboard that simulates scanning external posts for custom search terms (e.g., "Kingston property").
   - Filter leads by recency. Include an automated "Notify Me" toggle alert system.

5. MARKETING CONTENT MAKER:
   - A modular tool that lets users generate targeted promotional copy or social posts with a single click, based on customer data present in the CRM.

Let's begin by generating the directory structure and scaffolding the core layout.
[NEW CLAUDE PROMPT MADE WITH RESPECT TO THE SOLVIMON]
Act as a senior founding engineer. I need you to scaffold a commercial-grade, modular AI-native CRM called "ForgeCRM" optimized specifically for startup monetization, product-market fit, and a clear path to revenue to target the Solvimon hackathon track.

Our timeframe is ultra-short (1.5 days), so generate highly modular, production-ready, immediately executable Next.js (App Router), Tailwind CSS, and Supabase-ready code.

Structure the app into independent, modular components across these high-value business pillars:

1. LANGUAGE-DRIVEN MONETIZATION DASHBOARD (Solvimon Commercial Focus):
   - Layout: A sleek SaaS dashboard matching modern components (ready for shadcn/v0 styles).
   - Core Feature: An omni-search navigation bar that interprets natural language commercial requests (e.g., typing "show expected revenue from tier upgrades" renders financial metrics).
   - Monetization UI: An analytics view mapping user CRM data directly onto flexible, usage-based pricing models and tier structures to show clear business viability.

2. CONVERSION-OPTIMIZED REAL ESTATE CO-PILOT:
   - Interactive property sales chat workspace. 
   - The AI analyzes mock data of historical successful closed deals to provide sales agents with recommended high-converting message replies.
   - Sync Mechanism: Accepting a response automatically pushes a mock data update, transitioning the lead further down the monetization funnel.

3. RETENTION & CUSTOMER SUPPORT ESCALATION:
   - A customizable client intake form for handling problems.
   - The AI evaluates the problem, logs a custom structured report, attempts an automated AI resolution, and flags unresolved high-value client issues immediately as "Escalate to Human" to prevent revenue churn.

4. SOCIAL LISTENING LEAD FINDER:
   - High-intent intent discovery dashboard that simulates scanning text feeds for purchase signals (e.g., filtering for "Looking to buy in Kingston").
   - Includes filtering for recency and instant notification alerts to capitalize on immediate buyer intent.

5. MARKETING CONTENT MAKER:
   - A dedicated workflow engine that auto-generates outbound marketing copy and pitch text targeting lookalike audiences found inside the CRM data to drive new customer acquisition.

Let's begin by generating the modular directory structure and building the core monetization dashboard layout.
