-- CreateTable
CREATE TABLE "public"."Scene" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "slugIntExt" TEXT,
    "slugLocation" TEXT,
    "slugTimeOfDay" TEXT,
    "lineCount" INTEGER,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "public"."Script"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
