import multer from "multer";
const upload = multer();

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
console.log("DB URL present:", !!process.env.DATABASE_URL);


import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

import { parseScenes } from "./utils/fountainParser";


const app = express();
app.use(cors());
app.use(express.json());


const prisma = new PrismaClient();

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use((req, _res, next) => {
    console.log("REQ", req.method, req.path);
    next();
});

app.post("/ping", (_req, res) => {
    console.log("hit /ping");
    res.json({ ok: true });
});
  

app.post("/api/projects", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({error: "Name is required!"});
        }
        console.log("here inside the handler...", name);
        const project = await prisma.project.create({
            data: { name }, 
        });
        console.log("here inside the handler after call...", name);

        res.json(project);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: "Server error. "});
    }
});

app.get("/api/projects", async (req: Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, createdAt: true},
        });
        res.json(projects);
    } catch(err) {
        console.error("list projects error: ", err);
        res.status(500).json({error: "Server Error. "});
    }
});

app.post("/api/scripts", upload.single("file"), async (req: Request, res: Response) => {
    try {
        const { projectId, title } = req.body as { projectId?: string; title?: string;}
        if (!projectId) return res.status(400).json({ error: "projectId is required" });
        if (!req.file)   return res.status(400).json({ error: "file is required" });

        const rawText = req.file.buffer.toString("utf-8");
        const filename = req.file.originalname || "";
        const ext = filename.split(".").pop()?.toLowerCase();

        const format = (ext === "fountain" || ext === "txt") ? ext : "txt";

        const finalTitle = title?.trim() || filename || "Untitled Script";

        const script = await prisma.script.create({
            data: { projectId, title: finalTitle, rawText, format },
            select: { id: true, title: true, format: true, createdAt: true },
        });

        return res.json(script);
    } catch(err) {
        console.error("upload error: ", err);
        return res.status(500).json({error: "Server Error."});
    }
});

app.get("/api/projects/:id/scripts", async (req, res) => {
    console.log("list scripts for", req.params.id);
    const scripts = await prisma.script.findMany({
      where: { projectId: req.params.id },
      select: { id: true, title: true, format: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    console.log("found", scripts.length);
    res.json(scripts);
  });

  app.get("/api/scripts", async (_req, res) => {
    const all = await prisma.script.findMany({ select: { id: true, projectId: true, title: true } });
    res.json(all);
  });

app.post("/api/scripts/:id/parse", async (req: Request, res: Response) => {
    try {
        const script = await prisma.script.findUnique({
            where: { id: req.params.id }
        });
        if (!script) {
            return res.status(404).json({
                error: "Script not found!",
            });
        }

        const parsed = parseScenes(script.rawText);

        await prisma.scene.deleteMany({ where: { scriptId: script.id } });

        // Save Scenes to DB
        const scenes = await prisma.$transaction(
            parsed.map(s => {
                return prisma.scene.create({
                    data: {
                        scriptId: script.id,
                        index: s.index,
                        slugIntExt: s.intExt ?? null,
                        slugLocation: s.location ?? null,
                        slugTimeOfDay: s.timeOfDay ?? null,
                        lineCount: s.body ? s.body.split(/\r?\n/).filter(Boolean).length : 0,
                        body: s.body ?? null,
                      },
                })
            })
        );
        res.json({ count: scenes.length, scenes });
    } catch(err) {
        console.error("parse error", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/api/scripts/:id/scenes", async (req, res) => {
    const includeBody = req.query.includeBody === "1";
  
    const scenes = await prisma.scene.findMany({
      where: { scriptId: req.params.id },
      orderBy: { index: "asc" },
      select: {
        id: true,
        index: true,
        slugIntExt: true,
        slugLocation: true,
        slugTimeOfDay: true,
        lineCount: true,
        ...(includeBody ? { body: true } : {}),  // <— add
      },
    });
  
    const formatted = scenes.map((s: any) => ({
      id: s.id,
      index: s.index,
      slugline: [s.slugIntExt?.toUpperCase(), s.slugLocation, s.slugTimeOfDay?.toUpperCase()]
        .filter(Boolean).join(" - "),
      lineCount: s.lineCount ?? 0,
      meta: {
        intExt: s.slugIntExt ?? null,
        location: s.slugLocation ?? null,
        timeOfDay: s.slugTimeOfDay ?? null,
      },
      ...(includeBody ? { body: s.body ?? "" } : {}), // <— add
    }));
  
    res.json({ count: formatted.length, scenes: formatted });
  });

app.get("/api/scenes/:sceneId", async (req, res) => {
    const s = await prisma.scene.findUnique({
        where: {
            id: req.params.sceneId,
        },
        select: {
            id: true,
            index: true,
            slugIntExt: true,
            slugLocation: true,
            slugTimeOfDay: true, 
            lineCount: true, 
            body: true ,
        },
    });
    if (!s) return res.status(404).json({ error: "Not found" });
    res.json(s);
});
  


app.use((err: any,_req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Server error" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API on http://localhost:${port}`));


process.on("uncaughtException", (err) => {
    console.error("uncaught exception:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("unhandled rejection:", reason);
  });
  
