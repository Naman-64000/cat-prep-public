# CAT Knowledge Vault

A personal CAT preparation desktop application built with Electron, React, TypeScript, TailwindCSS, SQLite, Prisma, and Google Gemini. The app provides a private repository for CAT questions, solutions, and study tracking across VARC, DILR/LRDI, and QUANTS sections.

---

## Project Purpose

CAT Knowledge Vault is designed to help aspirants organize CAT practice questions and solutions in a single desktop app. It supports multi-image question uploads, AI-generated solutions using Google Gemini, detailed question note-taking, category/flair tagging, and study session tracking. The app works offline for storage and local image management while using Gemini for solution generation only when needed.

---

## Features

### 1. Section-based Question Organization
* Support for **VARC**, **LRDI**, and **QUANTS** sections.
* **Multi-Image Support**:
  * `VARC` questions accept up to 5 images.
  * `LRDI` questions accept up to 6 images (to support passage + charts).
  * `QUANTS` questions accept a single image.
* **Drag & Drop Upload Zone**: Drag and drop question screenshots to upload.
* **Clipboard Paste Support**: Copy any question image to your clipboard and paste directly with `Ctrl+V` or `Cmd+V`.
* **Chronological Ordering**: The database queries default to an oldest-first order (ascending by creation date), meaning older questions remain at the top of the list, and newly added questions are appended at the bottom.

### 2. Multi-Image Slideshow Preview Modal
* When clicking on a question card's image thumbnail, it opens a premium slideshow modal.
* **Interactive Navigation Controls**:
  * Overlay Left (`←`) and Right (`→`) arrow buttons allow cycling through images.
  * Arrow keys (`ArrowLeft` / `ArrowRight`) on the keyboard are fully supported.
  * A page index counter (e.g. `1 / 3`) at the bottom tracks the active image.
  * Close the overlay modal using the **Close** button or by pressing the `Escape` key.

### 3. AI Solution Generation & Classification
* Google Gemini API extracts the question text from uploaded images and generates a detailed step-by-step markdown solution.
* **Smart Section Detection**: Suggests moving the question to another section if Gemini predicts that a math problem or logical reasoning set was uploaded to the wrong section.
* **Structured Topic Tagging**:
  * Dynamically classifies questions into subtopics and specific topics (e.g., `Arithmetic › Percentages`, `LR › Arrangements`, or `RC › Philosophy`) on solution generation.
  * Uses a `"Not Sure"` topic fallback if categorization is uncertain.
  * Clean parsing: Strips `TOPIC_CHECK` header metadata cleanly from the final rendered markdown.

### 4. Topic & Flair Tagging (Reddit-style)
* **Reddit-style Flairs**: Tag questions with reasons for failure (e.g., `Concept Gap`, `Formula Forgotten`, `Calculation Error`, `Tone`, `Inference`, `Set Selection`, etc.).
* **Quick Assign Dropdown**: Click the **Flairs** button to open a side-opening popover that lets you quick-assign flairs directly from the card.
* **Manual Topic Selector**: Click the **Topic** button to open an interactive, downward-opening popover. Choose the subtopic first, then choose a topic (including `"Not Sure"`) or clear the selection. Topics and subtopics render as wrapped pills.
* **Badge Order**: Section, flair, and topic badges render cleanly, with the topic badge positioned at the end of the badge sequence.

### 5. Multi-Tab Filters Bar
* Quickly filter questions inside the active prep section using:
  * **ALL**: Lists all questions in the section.
  * **SOLVED**: Questions with an AI-generated solution.
  * **UNSOLVED**: Questions awaiting a solution.
  * **BOOKMARKED**: Starred questions for quick revision.
  * **FLAIR**: Filter by one or multiple flairs using OR (`some`) selection logic from a side-opening dropdown.
  * **TOPIC**: Filter by subtopic or a specific topic from a 2-step popover. The tab button updates dynamically (e.g. `Arithmetic (ALL)` or `RC › Philosophy`) to display the active query filter.

### 6. Analytics Dashboard
* Accessible in the sidebar between the core prep sections and the Study Tracker.
* **Prep Metrics Summary**:
  * **Total Questions**: Displays cumulative questions count and a section-specific split-progress bar (VARC, LRDI, QUANTS). Users can click on any section row (VARC, LRDI, or QUANTS) to drill down and see the detailed subtopic question count breakdown, with the card layout dimensions remaining perfectly constant.
  * **Study Duration**: Summarizes total tracker hours, including a matching segment progress bar and breakdowns for VARC Focus, LRDI Focus, and QUANTS Focus.
  * **Most Common Flairs**: Renders an ordered grid showing the most frequently assigned tags (e.g. `Formula Forgotten (31)`) to identify weak areas.

### 7. Enhanced Study Tracker
* Log daily study sessions with hours, minutes, a mandatory section selection (`VARC`, `DILR`, `QUANTS`, `ALL`), and an optional one-sentence note.
* Supports multiple entries per date (enabling logging separate sessions for different subjects on the same day).
* Includes a Study Hours Report bar chart with vertical grid lines and custom baseline alignment.
* Displays a detailed study records listing showing section badges and notes right-aligned.

### 8. Premium Aesthetics
* Harmonious dark theme using HSL tailored colors, clean borders, glassmorphic card overlays, z-index overlays, and responsive layouts.

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
│       │   └── Analytics.tsx   # Analytics stats page
│       ├── hooks/
│       │   └── useClipboardPaste.ts
│       └── utils/
│           └── constants.ts
└── .env
```

---

## Database Schema

### `Question`
* `id`: `Int` (Primary Key, auto-increment)
* `section`: `String` (`VARC`, `LRDI`, `QUANTS`)
* `solution`: `String?` (AI-generated step-by-step markdown solution)
* `bookmarked`: `Boolean` (default: `false`)
* `notes`: `String` (default: `""`)
* `flairs`: `String` (comma-separated flairs, default: `""`)
* `subtopic`: `String` (default: `""`)
* `topic`: `String` (default: `""`)
* `images`: `QuestionImage[]` (relation to question image paths)
* `createdAt`: `DateTime` (default: `now()`)
* `updatedAt`: `DateTime` (updated on change)

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
* `note`: `String` (defaults to `""`)
* `createdAt`: `DateTime` (default: `now()`)

---

## Setup Instructions

1. Clone or copy the repository into a local folder.
2. Open the project folder in VS Code or your preferred terminal.
3. Create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   DATABASE_URL="file:./prisma/public.db"
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
