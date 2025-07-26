const YahooFinanceService = require('../dist/services/yahooFinanceService.js').default;

async function testYahooData() {
  const service = new YahooFinanceService();
  
  try {
    console.log('Testing Yahoo Finance data for MSFT...');
    const data = await service.getStockData('MSFT');
    
    console.log('\nMSFT Data:');
    // Print individual fields as before
    console.log(`Symbol: ${data.symbol}`);
    console.log(`Price: $${data.currentPrice}`);
    console.log(`P/E Ratio: ${data.peRatio}`);
    console.log(`Dividend Yield: ${data.dividendYield}%`);
    console.log(`Sector: ${data.sector}`);
    console.log(`Gross Margin: ${data.grossMargins}%`);
    console.log(`ROIC: ${data.roic}%`);
    console.log(`Earnings Growth: ${data.earningsGrowth}%`);
    console.log(`Sales Growth: ${data.salesGrowthRate}%`);
    console.log(`EPS Growth: ${data.epsGrowthRate}%`);
    console.log(`BVPS Growth: ${data.bvpsGrowthRate}%`);
    console.log(`FCF Growth: ${data.fcfGrowthRate}%`);
    console.log(`Sector P/E: ${data.sectorPeAverage}`);

    // Print all properties dynamically
    console.log('\nAll returned data fields:');
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    console.log('\nFull data object:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error fetching Yahoo data:', error);
  }
}

testYahooData();
