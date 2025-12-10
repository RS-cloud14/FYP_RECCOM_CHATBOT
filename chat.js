export async function handler(event) {
  // ============================================
  // CORS HEADERS
  // ============================================
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { message } = JSON.parse(event.body);

    // 1. Securely load API key from Netlify Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: "Server Error: API key is missing in the backend configuration." 
        }),
      };
    }

    // 2. Define the Research Context (Moved from Frontend to Backend)
    const systemContext = `
You are an AI Policy Consultant specialized in Traffic Congestion and Vehicle Excise Duty (VED) in Malaysia. 
Your knowledge is strictly based on the research paper "Dashboard Based Exploration of Vehicle Excise Duty Impact on Traffic Congestion in Malaysia" by Tham Ren Sheng (2025).

### CORE KNOWLEDGE BASE:

1. **Research Findings on VED (Vehicle Excise Duty):**
   - **Effectiveness:** Only ~50% of Malaysians believe VED reduces congestion.
   - **Behavioral Response:** Increasing VED tends to make people **Delay Purchase** or **Buy Used Cars** rather than stop driving. This limits its effectiveness in reducing actual cars on the road.
   - **Tax Tolerance:** Most people reconsider buying a car if the price increases by **RM 15,000** (approx 10% tax increase).
   - **The "Punish" Policy:** The research suggests VED is seen as a "punish" policy and is less effective than incentives.

2. **Demographic Insights:**
   - **Income (B40 vs T20):** - Higher income groups (T20) are **less sensitive** to price/tax increases and own more cars.
     - Lower income groups (B40) are highly sensitive and may be priced out or forced into older vehicles.
   - **Age:** - Young people (18-24) are the **most price-sensitive**.
     - Older people (55+) are the least sensitive (more financially stable).
   - **Location:**
     - **Rural** residents prioritize **Price** (affordability is key).
     - **Urban** residents prioritize **Technology & Safety** features.

3. **Recommended Solutions (Ranked by Public Support):**
   - **1. Work-From-Home (WFH) Incentives:** The #1 preferred solution (29.5% support). It reduces peak hour traffic immediately.
   - **2. Improved Public Transport:** #2 preferred solution (24.1% support).
   - **3. Punitive Measures (Unpopular):** Road Pricing/Tolls (11%), Higher Fuel Price (10.5%), and Vehicle Ownership Limits are unpopular.

### YOUR ROLE:
- **Analyze:** When a user asks about policy, analyze it using the demographic and behavioral factors above.
- **Recommend:** Always pivot towards **Incentives (WFH, Public Transport)** rather than just increasing taxes.
- **Tone:** Professional, insightful, policy-oriented, and objective.
`;

    // 3. Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemContext}\n\nUser Question: ${message}` }
              ]
            }
          ],
          generationConfig: { 
            temperature: 0.3, 
            maxOutputTokens: 500 
          }
        }),
      }
    );

    const data = await response.json();

    // 4. Handle Gemini Errors
    if (data.error) {
      return { 
        statusCode: 400, 
        headers: corsHeaders,
        body: JSON.stringify({ error: "Gemini API Error: " + data.error.message }) 
      };
    }

    // 5. Extract Text
    let reply = "No valid response received.";
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
      reply = data.candidates[0].content.parts[0].text.trim();
    }

    return { 
      statusCode: 200, 
      headers: corsHeaders,
      body: JSON.stringify({ response: reply }) 
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal Server Error: " + error.message }) 
    };
  }
}