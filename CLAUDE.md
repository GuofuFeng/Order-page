# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Server
*   Run local server with Vite: `npm run dev` (Starts a combined Express + Vite development proxy server on port 3000)
*   Build application: `npm run build`
*   Start production build: `npm run start`

### Code Quality
*   Typecheck TypeScript files: `npm run lint` (runs `tsc --noEmit`)
*   Clean build outputs: `npm run clean`

*Note: This repository does not contain a unit test suite. Run static typing verification before committing.*

## Code Architecture

This project is a React-based application that parses, stores, and evaluates betting configurations against lottery outcomes.

### Core Architecture Flow
1.  **State Management & UI (`src/App.tsx`)**: The UI operates page states ('order', 'draw', 'batch', 'confirm'), handles basket separation (Baskets A-E), and leverages custom React components (such as `BatchImportRow`) to capture raw text configurations.
2.  **Input Parsing (`src/utils/betParser.ts`)**: Natural language betting inputs are parsed via regular expressions into structured JSON configurations defined in `src/types.ts`. It splits segments based on recognized lottery aliases and extracts attributes (numbers, tails, zodiacs, wave colors, combinations, not-ins).
3.  **Winning Evaluation (`src/utils/winningCalculator.ts`)**: Evaluates parsed bets against a user-locked set of draw numbers (6 normal numbers, 1 special number). It applies precise payouts, odds multipliers (handling special rules like Horse flat zodiac 1.8x odds and different baseline odds per lottery type), and calculates the winning breakdown.
4.  **Export Engine (`src/App.tsx`)**: Uses `exceljs` to export results. It builds rich-text formatted worksheets, highlighting winning numbers in red, blue, or green to match wave colors (using cell styling and fonts).
5.  **Storage Layer (`src/utils/storage.ts`)**: Syncs state with localStorage automatically.
6.  **Backend (`server.ts`)**: Lightweight Express server serving static assets in production or wrapping the Vite dev middleware.

### Crucial Constraints & Types
*   **Draw Numbers array**: Must contain exactly 7 elements (last element is the special/extra number).
*   **Colors**: Numbers 1-49 are mapped to Red, Blue, and Green wave colors in `src/constants.ts`.
*   **Zodiac indices**: Determined by `(num - 1) % 12` mapped against a fixed list of zodiac characters.
