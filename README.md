# CAT Knowledge Vault

A secure, multi-user CAT preparation desktop application built with Electron, React, TypeScript, TailwindCSS, SQLite, Prisma, and Google Gemini. The app provides a private repository for CAT questions, solutions, study tracking, and mock exam reports across VARC, DILR/LRDI, and QUANTS sections.

---

## GitHub Repository Metadata

If you are publishing this repository on GitHub, here are the recommended metadata settings:
* **One-Line Description**: A secure, multi-user CAT preparation desktop vault with AI-generated solutions, study tracking, exam countdowns, and performance reports.
* **Topics (Tags)**: `electron`, `react`, `typescript`, `sqlite`, `prisma`, `gemini-api`, `exam-preparation`, `study-tracker`, `analytics`, `education-app`

---

## Project Purpose

CAT Knowledge Vault is designed to help aspirants organize CAT practice questions, solutions, study records, and mock exam report cards in a single desktop application. It supports multi-image question uploads, AI-generated step-by-step solutions using Google Gemini, study session logs, and performance tracking. 

> [!NOTE]
> **Architecture & Privacy Note**: By utilizing a local SQLite database, the app works entirely offline for image and note management. All accounts and database files are stored locally on each user's computer. There is **no central cloud server**, meaning each user's data remains private to their machine, and administrators/developers cannot see other users' accounts or data.

---

## Features

### 1. Multi-User Authentication & Data Isolation
* **Secure Signup & Sign In**: Users can register with an email and password. Passwords are securely salted and hashed using Node's cryptographic `pbkdf2Sync` algorithm.
* **Persistent Sessions (Remember Me)**: An optional "Remember me" checkbox on login/signup persists user sessions for **30 days** (industry standard) in a local `session.json` configuration file, avoiding repeated log-ins.
* **Complete Data Scoping & Local Privacy**: All practice questions, solutions, study logs, mock reports, settings, and uploaded image folders are isolated in the database and filesystem by `userId` (lowercase email) on the user's hard drive. No user data is transmitted to external servers except securely to the Gemini API during solution generation.

### 2. Section-based Question Organization
* Support for **VARC**, **LRDI**, and **QUANTS** sections.
* **Multi-Image Support**:
  * `VARC` questions accept up to 6 images (e.g. for long reading comprehension passages and multiple questions).
  * `LRDI` questions accept up to 6 images (to support passage + charts).
  * `QUANTS` questions accept a single image.
* **Drag & Drop Upload Zone**: Drag and drop question screenshots to upload.
* **Clipboard Paste Support**: Copy any question image to your clipboard and paste directly with `Ctrl+V` or `Cmd+V`.
* **Chronological Ordering**: Database queries retrieve questions in oldest-first order (ascending by creation date), meaning older questions remain at the top of the list, and newly added questions are appended at the bottom.

### 3. Multi-Image Slideshow Preview Modal
* Clicking on a question card's image thumbnail opens a slideshow modal.
* **Interactive Navigation Controls**:
  * Left (`←`) and Right (`→`) arrow buttons positioned outside the modal box allow cycling through images.
  * Arrow keys (`ArrowLeft` / `ArrowRight`) on the keyboard are fully supported.
  * A page index counter (e.g. `1 / 3`) at the bottom tracks the active image.
  * Close the overlay modal using the **Close** button or by pressing the `Escape` key.

### 4. AI Solution Generation & Classification
* Google Gemini API extracts the question text from uploaded images and generates a detailed step-by-step markdown solution.
* **Regenerate Solutions (Max 2 Attempts)**: If unsatisfied with a solution, the user can click **Regenerate Solution** once. The app allows at most 2 generation attempts per question in total. On the second attempt, a reinforced instruction is appended: *"I am asking this second time, please do it step by step and make no mistake."* Once the second attempt completes, the regenerate button disappears.
* **API Key Verification & Saved State**: Private Gemini API keys are verified before saving. Verified keys are locked in a non-clickable `Saved Key` state. If a user edits the textbox, the `Verify & Save Key` button appears again. Keys are encrypted using `aes-256-cbc` and saved in the SQLite database per user.
* **Smart Section Detection**: Suggests moving the question to another section if Gemini predicts that a math problem or logical reasoning set was uploaded to the wrong section.
* **Structured Topic Tagging**:
  * Dynamically classifies questions into subtopics and specific topics (e.g., `Arithmetic › Percentages`, `LR › Arrangements`, or `RC › Philosophy`) on solution generation.
  * Uses a `"Not Sure"` topic fallback if categorization is uncertain.
  * Clean parsing: Strips `TOPIC_CHECK` header metadata cleanly from the final rendered markdown.

### 5. Topic & Flair Tagging (Reddit-style)
* **Reddit-style Flairs**: Tag questions with reasons for failure (e.g., `Concept Gap`, `Formula Forgotten`, `Calculation Error`, `Tone`, `Inference`, `Set Selection`, etc.).
* **Quick Assign Dropdown**: Click the **Flairs** button to open a side-opening popover that lets you quick-assign flairs directly from the card.
* **Manual Topic Selector**: Click the **Topic** button to open an interactive popover. Choose the subtopic first, then choose a topic (including `"Not Sure"`) or clear the selection. Topics and subtopics render as wrapped pills.
* **Badge Order**: Section, flair, and topic badges render cleanly, with the topic badge positioned at the end of the badge sequence.

### 6. Multi-Tab Filters Bar
* Quickly filter questions inside the active prep section using:
  * **ALL**: Lists all questions in the section.
  * **SOLVED**: Questions with an AI-generated solution.
  * **UNSOLVED**: Questions awaiting a solution.
  * **BOOKMARKED**: Starred questions for quick revision.
  * **FLAIR**: Filter by one or multiple flairs using OR (`some`) selection logic from a side-opening dropdown.
  * **TOPIC**: Filter by subtopic or a specific topic from a 2-step popover. The tab button updates dynamically (e.g. `Arithmetic (ALL)` or `RC › Philosophy`) to display the active query filter.

### 7. Analytics Dashboard
* **Prep Metrics Summary**:
  * **Total Questions**: Displays cumulative questions count and a section-specific split-progress bar (VARC, LRDI, QUANTS). Users can click on any section row to drill down and see the detailed subtopic question count breakdown.
  * **Study Duration**: Summarizes total tracker hours, including a segment progress bar aggregating VARC Focus, LRDI Focus, and QUANTS Focus.
  * **Most Common Flairs**: Renders an ordered grid showing the most frequently assigned tags to identify weak areas.

### 8. Exam Countdown (Customizable Start Date)
* Displays a target countdown to the CAT exam on **November 29, 2026**.
* **Customizable Start Date**: Allows editing the start date directly inside the app (supporting values from **Jan 1, 2026** to **Nov 15, 2026** with year fixed to 2026).
* **Dynamic Circle Completion**: The circular progress ring's duration reduces daily based on `1 / days_between_start_and_end_date`.

### 9. Mock Exams Reports Card Section
* Record sectional or full mock tests inside the app.
* **Section Filtering**: Filter mock report cards via sectional pills (ALL, VARC, DILR, QUANTS) that auto-focus the active tab.
* **Fully Positioned Portals**: The glassmorphic mock report addition modal is wrapped in a React Portal (`createPortal`), ensuring it covers 100% of the screen background.

### 10. Enhanced Study Tracker & Logs Filtering
* Log daily study sessions with hours, minutes, sections, and notes.
* **Tag Management**: Allow users to create or delete custom tags. Pre-seeds only `sectional mock` by default for sections and `mock` for ALL.
* **History Filtering**: Dynamically filter logged history records by Section and Topic Tag.

### 11. Section-based Study To-Do Lists
* **Daily Action Items**: Track goals inside each active prep section (VARC, LRDI, or QUANTS) separately.
* **Metadata & Time Slots**: Assign specific dates, custom or default topic tags, and scheduled time-slots (with strict format validation) for every task.
* **Persistent Reminders**: Integrates with local notifications to remind users to transfer finished action items into their main Study Tracker logs.

### 12. Custom Settings & Local Data Privacy
* **Local Privacy Assurance**: The app clarifies how data is stored locally in the SQLite database with no cloud fallback, guaranteeing 100% offline private use.
* **Gemini API Key Setup**: Verify, encrypt (via `aes-256-cbc`), and save personal Google Gemini API keys. Clearing a key disables solution generation features safely.
* **Feedback Suggestions Form**: Submit questions or feature feedback directly from the app. A 1-hour rate limit prevents double-submissions.

### 13. Light & Dark Themes
* **Dynamic Theme Switcher**: Toggle between light and dark modes from the sidebar. The setting is persisted in local storage.

---

## Folder Structure

```
cat-prep/
├── README.md
├── package.json
├── tsconfig.json
├── electron-builder.json
├── public/
│   ├── index.html
│   └── assets/
├── prisma/
│   ├── schema.prisma
│   └── public.db
├── src/
│   ├── main/
│   │   ├── index.ts        # Electron main process & IPC handlers
│   │   ├── prisma.ts       # Database client initialization
│   │   ├── gemini.ts       # Gemini prompt construction & parser
│   │   ├── storage.ts      # Local image fs storage controller
│   │   └── types.ts        # Common type declarations
│   ├── preload.ts          # IPC renderer context bridge
│   └── renderer/
│       ├── App.tsx         # Main router layout
│       ├── index.tsx       # Renderer entrypoint
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── SectionPage.tsx
│       │   ├── UploadZone.tsx
│       │   ├── QuestionCard.tsx
│       │   ├── SolutionViewer.tsx
│       │   ├── StudyTracker.tsx
│       │   ├── SearchFilterBar.tsx
│       │   ├── NotificationToast.tsx
│       │   ├── Analytics.tsx   # Analytics stats page
│       │   ├── Settings.tsx    # Settings & Gemini key verification page
│       │   ├── AuthPage.tsx    # Multi-user Sign In / Sign Up interface
│       │   └── TodoList.tsx    # Local task workspace per prep section
│       ├── hooks/
│       │   └── useClipboardPaste.ts
│       └── utils/
│           └── constants.ts
└── .env
```

---

## Database Schema

### `User`
* `id`: `String` (Primary Key, lowercase email address)
* `password`: `String` (hashed password)
* `salt`: `String` (random salt)
* `geminiApiKey`: `String?` (AES-256-CBC encrypted Gemini API key)
* `createdAt`: `DateTime` (default: `now()`)

### `Question`
* `id`: `Int` (Primary Key, auto-increment)
* `section`: `String` (`VARC`, `LRDI`, `QUANTS`)
* `solution`: `String?` (AI-generated step-by-step markdown solution)
* `generationCount`: `Int` (Default: `0`, tracks Gemini solution requests, limit of 2)
* `bookmarked`: `Boolean` (default: `false`)
* `notes`: `String` (default: `""`)
* `flairs`: `String` (comma-separated flairs, default: `""`)
* `subtopic`: `String` (default: `""`)
* `topic`: `String` (default: `""`)
* `images`: `QuestionImage[]` (relation to question image paths)
* `createdAt`: `DateTime` (default: `now()`)
* `updatedAt`: `DateTime` (updated on change)
* `userId`: `String` (Foreign Key referencing `User.id`, deletes cascade)

### `QuestionImage`
* `id`: `Int` (Primary Key, auto-increment)
* `path`: `String` (local path to stored image file)
* `questionId`: `Int` (Foreign Key referencing `Question.id`, deletes cascade)

### `StudyLog`
* `id`: `Int` (Primary Key, auto-increment)
* `date`: `DateTime` (allows multiple records per date)
* `hours`: `Int`
* `minutes`: `Int`
* `section`: `String` (defaults to `"ALL"`)
* `tag`: `String` (defaults to `""`)
* `note`: `String` (defaults to `""`)
* `createdAt`: `DateTime` (default: `now()`)
* `userId`: `String` (Foreign Key referencing `User.id`, deletes cascade)

### `ReportCard`
* `id`: `String` (Primary Key)
* `name`: `String`
* `paperType`: `String`
* `sectionalType`: `String?`
* `varcTotalQs`: `Int`
* `dilrTotalQs`: `Int`
* `qaTotalQs`: `Int`
* `varcRows`: `String` (Stringified JSON array of ReportRow)
* `dilrRows`: `String` (Stringified JSON array of ReportRow)
* `qaRows`: `String` (Stringified JSON array of ReportRow)
* `totalAttempted`: `Int` (default: `0`)
* `totalCorrect`: `Int` (default: `0`)
* `totalIncorrect`: `Int` (default: `0`)
* `marks`: `Int` (default: `0`)
* `createdAt`: `DateTime` (default: `now()`)
* `userId`: `String` (Foreign Key referencing `User.id`, deletes cascade)

### `Suggestion`
* `id`: `Int` (Primary Key, auto-increment)
* `text`: `String`
* `createdAt`: `DateTime` (default: `now()`)
* `userId`: `String` (Foreign Key referencing `User.id`, deletes cascade)

---

## Installation Guide (Unsigned Warning Bypass)

Because this is a free, open-source project, the built installers are not code-signed. Developer code signing certificates cost $99/year for macOS and $300+/year for Windows, so keeping the binaries unsigned keeps this project 100% free and community-driven. 

When you install the app for the first time, your operating system will display a security warning. Follow the steps below to bypass it:

### For Windows Users (Recommended - `.zip`):
1. Download the `CAT.Knowledge.Vault-0.1.0-win.zip` (or `CAT.Knowledge.Vault-0.1.0-arm64-win.zip` depending on architecture) file.
2. Right-click the `.zip` file and select **Extract All** to unzip it.
3. Open the extracted folder, go to `win-unpacked`, and double-click **`CAT Knowledge Vault.exe`**.
4. If Windows SmartScreen blocks it, click **More Info** -> **Run Anyway**.
*(Note: Using the `.zip` version is recommended because the `.exe` installer is often blocked or quarantined by Windows Defender due to being unsigned).*

### For macOS Users (Gatekeeper Bypass):
1. Download the `.dmg` file, open it, and drag the **CAT Knowledge Vault** app icon into your **Applications** folder.
2. Navigate to your Applications folder, **Right-click** (or hold `Control` and click) the **CAT Knowledge Vault** app icon, and select **Open** from the context menu.
3. A confirmation dialog will appear saying *"macOS cannot verify the developer..."*. Click **Open** to launch the app.
*(Note: If it still does not open, go to **System Settings > Privacy & Security**, scroll down to the Security section, and click **Open Anyway**).*

---

## Setup Instructions

1. Clone or copy the repository into a local folder.
2. Open the project folder in VS Code or your preferred terminal.
3. Create a `.env` file in the project root:
   ```env
   DATABASE_URL="file:./public.db"
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Push schema updates to the SQLite database and generate the Prisma Client:
   ```bash
   npx prisma db push
   ```
6. Start the app in development mode:
   ```bash
   npm run dev
   ```
7. Build the production app:
   ```bash
   npm run build
   ```

---

## Development and Verification

Run `npm run build` to verify compilation for both main and renderer processes.
* **Main process compilation** builds main scripts to `dist/main`.
* **Renderer process compilation** bundles assets, React components, and icons into `dist/renderer`.
