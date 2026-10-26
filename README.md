# 🏡 Khammam AI Room Broker

An AI-powered room and PG discovery platform for Khammam. Ask for a stay in everyday language, explore hostel listings read from Excel workbooks, and get help finding a place that fits your needs. The project includes a React web app, an Express API, and an MCP server for listing searches.

## ✨ Features

- **AI room-finding chat:** Ask about rooms, budgets, locations, sharing, and AC preferences.
- **Conversational Tanglish replies:** Groq-powered chat is instructed to respond in friendly Telugu written with the English alphabet (Tanglish). Direct answers to supported budget, AC, and availability queries are generated from listing data.
- **Markdown rendering:** Assistant replies support Markdown, including GitHub Flavored Markdown tables for comparing options.
- **Local Excel data:** The API and MCP server read hostel and PG listings from the workbooks in `data/`.
- **Filtered MCP search:** Search by location, sharing type, AC status, maximum price, and minimum available beds.
- **Health endpoint:** Check API availability and whether listing data and the Groq key are configured.

## 🧰 Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite |
| Styling | Tailwind CSS configuration and custom CSS |
| Backend | Node.js, Express |
| AI responses | Groq SDK |
| Listing data | XLSX |
| Tool integration | Model Context Protocol (MCP) SDK |
| Markdown | `react-markdown`, `remark-gfm` |

## 📁 Project structure

```text
khammam-ai-broker/
├── data/
│   ├── siri_hostels.xlsx
│   ├── balaji_pg.xlsx
│   └── sairam_mens.xlsx
├── scripts/
│   └── generate-data.js       # Recreates sample Excel workbooks
├── server/
│   ├── api.js                 # Express API and Groq chat endpoint
│   ├── broker-mcp.js          # stdio MCP server
│   └── hostels.js             # Workbook loading, validation, and filtering
├── src/
│   ├── App.jsx                # Room-finder UI and chat
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .env.example               # Environment variable template
├── package.json
├── vite.config.js             # Frontend dev server and API proxy
└── README.md
```

## 🚀 Setup

### Requirements

- Node.js and npm
- A Groq API key for Groq-powered conversational answers

### Install and configure

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file from the example:

   ```bash
   copy .env.example .env
   ```

   On macOS or Linux, use `cp .env.example .env`.

3. Open `.env` and set your key:

   ```dotenv
   GROQ_API_KEY=your_groq_api_key
   API_PORT=3002
   ```

   Keep `.env` local and do not commit your API key. `API_PORT` is optional; the API defaults to port `3002`.

4. Ensure the Excel workbooks exist. To generate the included sample data:

   ```bash
   npm run data:generate
   ```

### Update the Excel listings

Edit the workbooks in `data/` directly, keeping the following column headers in the first worksheet:

| Column | Description |
| --- | --- |
| `hostel_name` | Hostel or PG name |
| `location` | Locality or landmark |
| `sharing` | Sharing type, such as `2 sharing` |
| `ac_non_ac` | AC status, such as `AC` or `Non-AC` |
| `price` | Monthly price in rupees |
| `available_beds` | Number of available beds |

The API validates these columns and the numeric `price` and `available_beds` values when it reads the workbooks. `npm run data:generate` recreates the sample workbooks and overwrites custom changes in those generated files.

## ▶️ Run the app

Start both the Vite frontend and Express API in one terminal:

```bash
npm run dev:all
```

This runs the `dev` and `api` scripts concurrently. Open the local Vite URL printed in the terminal (typically `http://localhost:5173`). In development, Vite forwards `/api` requests to the backend on `http://localhost:3002`.

To check the API through the frontend proxy, visit:

```text
http://localhost:5173/api/health
```

The health response includes the service status, listing count, API port, and whether `GROQ_API_KEY` is configured. The Vite proxy target is set in `vite.config.js`; if you change `API_PORT`, update that target to match.

You can also run the processes separately with `npm run api` and `npm run dev`.

## 🔌 MCP server integration

The MCP server uses **stdio** transport and exposes a `search_all_hostels` tool. Configure your MCP-compatible client to launch Node.js with `server/broker-mcp.js` as its argument and this project directory as the working directory. For example, run it manually with:

```bash
npm run mcp
```

The tool accepts optional `location`, `sharing`, `ac_non_ac`, `max_price`, and `min_available_beds` filters and returns matching workbook listings. MCP clients generally start this process themselves, so use the client’s MCP server configuration rather than leaving `npm run mcp` running in a separate terminal.

## 🧪 Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev:all` | Start the frontend and API together |
| `npm run dev` | Start only the Vite frontend |
| `npm run api` | Start only the Express API |
| `npm run mcp` | Start the stdio MCP server |
| `npm run data:generate` | Regenerate sample Excel workbooks |
| `npm run build` | Create a production frontend build |
| `npm run lint` | Run ESLint |
