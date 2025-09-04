# 🎬 ScriptPilot

ScriptPilot is an **open-source screenplay analysis API**.  
Upload `.fountain` or `.txt` scripts, organize them under projects, and extract structured **scenes** for further analysis.

---

## 🚀 Features
- Create and manage film **projects**.
- Upload scripts (`.fountain` / `.txt`) tied to projects.
- Store raw script text in a Postgres DB (via [Prisma](https://www.prisma.io/)).
- Parse scripts into **scenes**:
  - Detect scene headings (`INT./EXT.`).
  - Store scene sluglines, location, time of day.
  - Provide line counts for quick breakdown.
- Retrieve projects, scripts, and scenes via REST API.

---

## 🛠 Tech Stack
- **Backend:** Node.js + Express (TypeScript)
- **ORM:** Prisma
- **Database:** Postgres (e.g. [Neon](https://neon.tech))
- **Upload Handling:** Multer
- **Package Manager:** pnpm workspaces

---

## 📂 Project Structure
```
scriptpilot/
  apps/
    api/        # Express + TypeScript API
    web/        # (planned) Next.js frontend
  packages/
    shared/     # Shared types (future use)
  prisma/
    schema.prisma # Prisma models
```

---

## ⚙️ Setup

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/scriptpilot.git
cd scriptpilot
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Configure database
- Create a free Postgres DB (e.g. Neon).
- Copy the connection string.
- Create a `.env` file at the repo root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
```

### 4. Run migrations
```bash
pnpm prisma migrate dev -n init
pnpm prisma generate
```

### 5. Start API
```bash
cd apps/api
pnpm run dev
```

API will be live on [http://localhost:5000](http://localhost:5000).

---

## 🔗 API Endpoints

### Healthcheck
```bash
curl http://localhost:5000/healthz
```

### Projects
- **Create project**
  ```bash
  curl -X POST http://localhost:5000/api/projects     -H "Content-Type: application/json"     -d '{"name":"My Film"}'
  ```

- **List projects**
  ```bash
  curl http://localhost:5000/api/projects
  ```

### Scripts
- **Upload script**
  ```bash
  curl -X POST http://localhost:5000/api/scripts     -F projectId=<PROJECT_ID>     -F file=@sample.fountain
  ```

- **List scripts in a project**
  ```bash
  curl http://localhost:5000/api/projects/<PROJECT_ID>/scripts
  ```

### Scenes
- **Parse script into scenes**
  ```bash
  curl -X POST http://localhost:5000/api/scripts/<SCRIPT_ID>/parse
  ```

- **Get parsed scenes**
  ```bash
  curl http://localhost:5000/api/scripts/<SCRIPT_ID>/scenes
  ```

---

## 🧩 Example `.fountain` snippet
```fountain
INT. LIVING ROOM – DAY

JOHN
I can’t believe this works.

MARY
Believe it.

EXT. PARK – NIGHT

JOHN
Beautiful night, huh?
```

---

## 📌 Roadmap
- [ ] Scene character + prop extraction
- [ ] Next.js frontend dashboard
- [ ] NLP-powered insights (sentiment, pacing, etc.)
- [ ] Cloud deployment templates

---

## 🤝 Contributing
PRs welcome! For major changes, open an issue first to discuss.  
This repo is public under the MIT license.

---

## 📜 License
[MIT](LICENSE)
