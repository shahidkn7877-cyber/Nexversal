-- CreateTable
CREATE TABLE "keyword_researches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google-ads',
    "seedKeyword" TEXT,
    "seedUrl" TEXT,
    "location" TEXT NOT NULL DEFAULT 'US',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_researches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_research_results" (
    "id" TEXT NOT NULL,
    "researchId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "averageMonthlySearches" INTEGER,
    "competition" TEXT,
    "competitionIndex" INTEGER,
    "lowTopOfPageBid" DOUBLE PRECISION,
    "highTopOfPageBid" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_research_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keyword_researches_userId_idx" ON "keyword_researches"("userId");

-- CreateIndex
CREATE INDEX "keyword_researches_createdAt_idx" ON "keyword_researches"("createdAt");

-- CreateIndex
CREATE INDEX "keyword_research_results_researchId_idx" ON "keyword_research_results"("researchId");

-- CreateIndex
CREATE INDEX "keyword_research_results_keyword_idx" ON "keyword_research_results"("keyword");

-- AddForeignKey
ALTER TABLE "keyword_researches" ADD CONSTRAINT "keyword_researches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_research_results" ADD CONSTRAINT "keyword_research_results_researchId_fkey" FOREIGN KEY ("researchId") REFERENCES "keyword_researches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
