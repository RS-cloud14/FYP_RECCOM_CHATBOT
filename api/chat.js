export default async function handler(req, res) {
  // ============================================
  // CORS HEADERS (REQUIRED FOR POWER BI)
  // ============================================
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle Preflight Request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "API key missing. Set GEMINI_API_KEY in Vercel settings." });
    }

    // ============================================
    // RESEARCH CONTEXT (Based on MTA PE22029)
    // ============================================
    const systemContext = `You are an AI Research Assistant for the study "Vehicle Excise Duty (VED) Impact on Traffic Congestion in Malaysia" by Tham Ren Sheng (Universiti Malaysia Pahang Al-Sultan Abdullah).

    Use ONLY the following research findings to answer questions. Do not hallucinate outside data.

    RESEARCH FINDINGS SUMMARY:
    1. **Objective:** Examining if raising VED (tax) reduces traffic congestion.
    2. **Key Statistics:**
       - 65.8% agree VED influences buying decisions.
       - 61% agree VED helps reduce congestion.
       - **Price Sensitivity:** 73.7% of people reconsider buying a car if the price rises by RM10,000 - RM20,000 (approx 10-15% tax increase).
       - **Demographics:**
         - **Urban Users:** Prioritize Technology & Safety features.
         - **Rural Users:** Prioritize Price (High sensitivity).
         - **Age:** Youths (18-24) are most price-sensitive; Older (55+) are least sensitive.
         - **Income:** Higher income = more cars owned (Strong correlation).

    3. **Behavioral Response to Tax Hikes:**
       - 30.5% would "Delay Purchase".
       - 29.6% would "Buy a Used Car" (This is a problem: it doesn't reduce total cars on the road).
       - Only 14.6% would carpool.

    4. **Alternative Solutions (Public Preference):**
       - **Top Choice:** Work-From-Home (WFH) Incentives (29.5% support).
       - **Second Choice:** Improved Public Transport (24.1% support).
       - **Least Popular:** Higher Fuel Prices (10.5%) or Road Pricing/Tolls (11.1%).

    5. **Conclusion/Recommendation:**
       - VED has limitations because people shift to used cars.
       - The government should focus on **Work-From-Home incentives** (reduces peak hour traffic) and improving public transport rather than just "punishing" drivers with higher taxes.

    TONE: Professional, analytical, and based strictly on the data above.
    If asked about the author, it is Tham Ren Sheng.
    Keep answers concise (max 4-5 sentences).`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemContext}\n\nUser Question: ${message}` }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 512
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Gemini API Error:", data.error);
      return res.status(400).json({ error: data.error ? data.error.message : "AI service error." });
    }

    let reply = "I'm sorry, I couldn't generate a response based on the research data.";
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      reply = data.candidates[0].content.parts[0].text.trim();
    }

    return res.status(200).json({ response: reply });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }

}
