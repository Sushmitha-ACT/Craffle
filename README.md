# Project Setup

## Prerequisites

Before running the project, make sure you have the following installed:

- Node.js (v18 or later)
- npm

## Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Sushmitha-ACT/Craffle.git
cd Craffle
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory of the project and add the following:

```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

Replace the values with your actual credentials.

> **Note:** Do not commit `.env` or your API keys to GitHub.

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Open the Application

After the development server starts, open:

```
http://localhost:3000
```

The exact URL will also be displayed in the terminal.

---

## Build for Production

Create a production build:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

---

## Environment Variables

| Variable        | Description                                      |
|-----------------|--------------------------------------------------|
| `MONGODB_URI`   | MongoDB connection string for your database      |
| `GEMINI_API_KEY`| API key used to access Google Gemini services    |
| `JWT_SECRET`    | Secret key used for signing JWT tokens           |

---

## Project Structure

```
Craffle/
├── client/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── server/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── server.ts
├── shared/
│   ├── constants/
│   └── types/
├── public/
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Available Commands

| Command         | Description                          |
|-----------------|--------------------------------------|
| `npm install`   | Install project dependencies         |
| `npm run dev`   | Start the development server         |
| `npm run build` | Create a production build            |
| `npm start`     | Start the production server          |

---

## Security

- Never expose your API keys or secrets in source code.
- Never commit `.env` to the repository.
- Add `.env` to `.gitignore`.

Example `.gitignore` entries:

```
node_modules/
dist/
.env
.env.local
.env.*.local
```
