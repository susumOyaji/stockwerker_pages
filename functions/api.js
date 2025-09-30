// functions/api.js

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function fetchStockData(stockCode) {
  const targetUrl = `https://stock-worker.sumitomo0210.workers.dev/stock/${stockCode}`;
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Cloudflare-Worker-Proxy/1.0' },
    });
    if (!response.ok) {
      console.error(`Failed to fetch data for ${stockCode}: ${response.status}`);
      return { code: stockCode, name: 'N/A', error: `Failed to fetch: ${response.status}` };
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching data for ${stockCode}:`, error);
    return { code: stockCode, name: 'N/A', error: `Fetch failed: ${error.message}` };
  }
}

export async function onRequest(context) {
  // Handle CORS preflight requests
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(context.request.url);
    const codesParam = url.searchParams.get('codes');
    const singleCodeParam = url.searchParams.get('code');

    let stockCodes = [];
    if (codesParam) {
      stockCodes = codesParam.split(',').map(s => s.trim()).filter(s => s);
    } else if (singleCodeParam) {
      stockCodes.push(singleCodeParam.trim());
    }

    if (stockCodes.length === 0) {
      return new Response(JSON.stringify({ status: 'error', message: 'Query parameter "code" or "codes" is missing.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const promises = stockCodes.map(fetchStockData);
    const results = await Promise.all(promises);

    const responsePayload = { data: results };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: `Pages Function internal error: ${error.message}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}