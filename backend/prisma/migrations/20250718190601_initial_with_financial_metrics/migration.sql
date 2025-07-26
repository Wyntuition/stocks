-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" REAL NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StockCache" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "currentPrice" REAL,
    "previousClose" REAL,
    "dayChange" REAL,
    "dayChangePercent" REAL,
    "volume" BIGINT,
    "avgVolume" BIGINT,
    "marketCap" BIGINT,
    "peRatio" REAL,
    "dividendYield" REAL,
    "earningsGrowth" REAL,
    "week52High" REAL,
    "week52Low" REAL,
    "sector" TEXT,
    "industry" TEXT,
    "sectorPeAverage" REAL,
    "roic" REAL,
    "salesGrowthRate" REAL,
    "epsGrowthRate" REAL,
    "bvpsGrowthRate" REAL,
    "fcfGrowthRate" REAL,
    "totalRevenue" REAL,
    "totalDebt" REAL,
    "totalCash" REAL,
    "freeCashflow" REAL,
    "ebitda" REAL,
    "returnOnAssets" REAL,
    "returnOnEquity" REAL,
    "profitMargins" REAL,
    "operatingMargins" REAL,
    "grossMargins" REAL,
    "currentRatio" REAL,
    "quickRatio" REAL,
    "debtToEquity" REAL,
    "priceToBook" REAL,
    "pegRatio" REAL,
    "bookValue" REAL,
    "trailingEps" REAL,
    "forwardEps" REAL,
    "payoutRatio" REAL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_key_key" ON "UserSettings"("key");
