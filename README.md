# 🧠 SelfOS — Personal AI Wellness Companion

SelfOS is more than a habit tracker —
it's your personal AI-powered wellness assistant. 

It’s a private, lightweight, and intelligent system that helps me stay on top of **nutrition, workouts, mood, weight, and daily wellbeing** — powered by GPT, Firestore, and automation.

Built **for me, by me, with care**.

---

## ✨ What it does

SelfOS combines:

- ✍️ **Natural input** — via CLI, Discord bot, or even ChatGPT (early days)
- 🍽️ **Meal logging with GPT** — estimates kcal and macros based on plain text
- 📊 **Structured Firestore storage** — daily records organized by date
- 🤖 **AI reflections & summaries** — generated based on your mood, weight, and nutrition
- ⚖️ **Mood and weight tracking** — with optional fields
- 🧘‍♂️ **Health auto export support (WIP)** — integrate iOS Health / Apple Watch data
- 🛰️ **Daily summaries via GitHub Actions** — scheduled to send insights to Discord

This is a system that **learns with you**, keeps your data structured, and gives you **just enough feedback to stay on track** — without overwhelming dashboards or bloat.

---

## 🧱 Stack

- 🧠 [OpenAI GPT-4o](https://openai.com)
- 🔥 [Google Firestore (GCP)](https://cloud.google.com/firestore)
- 🧪 [Node.js + TypeScript](https://www.typescriptlang.org/)
- 🤖 [Discord.js](https://discord.js.org) (slash command bot)
- ☁️ GitHub Actions (nightly cron + CI)
- 🔐 Workload Identity Federation (GCP <-> GitHub auth)

---

## 📁 Project Structure

```
src/
├── core/             # firestore.ts, openai.ts, types.ts, goals.ts
├── utils/            # args parser and small helpers
├── bot/              # Discord bot and slash command handling
├── log-meal.ts       # Logs a meal with GPT macros
├── log-weight.ts     # Logs weight
├── log-mood.ts       # Logs mood
├── view-day.ts       # View a day’s entries
├── daily-summary.ts  # Generate & optionally save GPT reflection
├── edit-meal.ts      # Overwrite a specific meal by index
├── remove-meal.ts    # Remove a meal by index
```

---

## 🧪 Example usage

### ➕ Log a meal
```bash
npm run meal "200g chicken, butter, broccoli and white rice"
```

### 👀 View your day
```bash
npm run view:day
```

### 🧠 Add mood or weight

```bash
npm run log:mood "Feeling great after the run!"
npm run log:weight 80.3
```

### 💡 Get summary (w/ AI reflection)

```bash
npm run summary --save
```

---

## ⚙️ Setup & Configuration

If you'd like to fork or adapt **SelfOS** for your own use, here's what you'll need to configure:

### 🔐 Secrets

Create a `.env` file in the root:

```env
OPENAI_API_KEY=sk-...
DISCORD_BOT_TOKEN=...
DISCORD_WEBHOOK_URL=...
```

### ☁️ Google Cloud (Firestore)

1.	Create a GCP project *(e.g. selfos-test)*
2.	Enable Firestore in Native mode
3.	Create a service account (e.g. `github-actions-sa@...`)
4.	Create a Workload Identity Pool and OIDC provider for GitHub

5.	Grant IAM roles:
	•	`roles/datastore.user`
	•	`roles/iam.workloadIdentityUser`
	•	`roles/iam.serviceAccountTokenCreator`

6.	In GitHub Actions, authenticate using:
```yml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    token_format: 'access_token'
    workload_identity_provider: 'projects/…/providers/github-provider'
    service_account: 'github-actions-sa@…'
```

### 🧠 OpenAI

You’ll need an OpenAI account and API key with GPT-4o access.
Usage is pay-as-you-go, and cost is very low for text-only calls.

### 💬 Discord Bot (optional)

To enable Discord interaction:
	1.	Create a Discord Developer App
	2.	Add a bot, copy the token into `.env`
	3.	Set up slash commands in `src/bot/discord.ts`
	4.	Invite the bot to your private server using:
        ```https://discord.com/oauth2/authorize?client_id=...&scope=bot+applications.commands&permissions=2147552256```

✅ With all that in place, run:

```bash
npm install
npm run log:meal "banana, oats, 20g whey protein"
npm run summary --save
```

You're up and running.

---

## 🤖 Discord integration

SelfOS comes with a personal Discord bot that supports slash commands:
- /logmeal logs a meal (GPT-powered)
- Cron job posts your daily summary at 23:00 CET
- Also posts weekly weight trends on Fridays at 12:00 CET

More commands to come.

## 🛰️ GitHub Actions Automation

SelfOS runs scheduled tasks via GitHub Actions:

### 🗓️ **Daily Summary**

Every evening at **23:00 CET**, it:
- Aggregates meals, mood, and weight
- Generates a GPT-powered reflection
- Posts the summary to Discord
*(Optional: saves it to Firestore with --save)*

### 📉 **Weekly Weight Trend**

Every Friday at **12:00 CET**, it:
- Analyzes weight logs over time
- Generates a reflection using GPT
- Posts the trend summary to Discord
`(Optional: logs it to Firestore with --save)`

You can also trigger both manually via the Actions tab, and choose whether to save reflections.

## 🧱 Firestore structure

Each day is stored under:

```/days/yyyy-mm-dd```

A daily document can include:

```ts
{
  meals: Meal[],
  mood?: string,
  weight?: number,
  reflection?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🛠️ Roadmap

- ✅ Core meal/mood/weight CLI
- ✅ GPT-based kcal + macro estimation
- ✅ AI daily reflections
- ✅ Firestore TTL-compatible storage
- ✅ Discord integration
- ✅ GitHub Actions summary runner, daily & weekly for weight
- ⏳ Health Auto Export (Apple Health)
- ⏳ Trend analysis and TUI dashboard

---

## 🧠 Why SelfOS?

Because I wanted a system that was:
- 💡 Insightful, not overwhelming
- 🔒 Private and fully owned
- ✨ Actually fun to build and use

There’s no SaaS, no tracking, no noise — just a clean, focused wellness assistant that fits my life.

---

> *Build your best day, **every day.***