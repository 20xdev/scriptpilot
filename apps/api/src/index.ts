import multer from "multer";
const upload = multer();

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
console.log("DB URL present:", !!process.env.DATABASE_URL);


import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

import { parseScene } from "./utils/fountainParser";


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

        const parsed = parseScene(script.rawText);

        // Save Scenes to DB
        const scenes = await prisma.$transaction(
            parsed.map(scene => {
                return prisma.scene.create({
                    data: {
                        scriptId: script.id,
                        index: scene.index,
                        slugIntExt: scene.slug.split(".")[0], // quick hack
                        slugLocation: scene.slug,
                        lineCount: scene.body.split("\n").length,
                    }
                })
            })
        );
        res.json({ count: scenes.length, scenes });
    } catch(err) {
        console.error("parse error", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/api/scripts/:id/scenes", async (req: Request, res: Response) => {
    try {
        const scriptId = req.params.id;

        const scenes = await prisma.scene.findMany({
            where: { scriptId },
            orderBy: { index: "asc" },
            select: {
                id: true,
                index: true,
                slugIntExt: true,
                slugLocation: true,
                slugTimeOfDay: true,
                lineCount: true,
            }
        });
        // format a compact “slugline” field for UI
        const formatted = scenes.map(s => ({
            id: s.id,
            index: s.index,
            slugline: [
            s.slugIntExt?.toUpperCase(),
            s.slugLocation,
            s.slugTimeOfDay?.toUpperCase()
            ].filter(Boolean).join(" - "),
            lineCount: s.lineCount ?? 0,
            meta: {
            intExt: s.slugIntExt ?? null,
            location: s.slugLocation ?? null,
            timeOfDay: s.slugTimeOfDay ?? null,
            }
        }));
    
        res.json({ count: formatted.length, scenes: formatted });
    } catch(err) {
        console.error("get scenes error:", err);
        res.status(500).json({ error: "Server error" });
    }
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
  
