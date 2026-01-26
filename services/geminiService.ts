
import { GoogleGenAI } from "@google/genai";
import { Site, SimulationResult } from "../types";

export const getAISummary = async (sites: Site[], result: SimulationResult): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const siteDetails = sites.map(s => `- ${s.name}: ${s.currentOccupancy}/${s.totalCapacity} seats (Buffer: ${s.maintenanceBufferPercent}%)`).join('\n');
  const outcomeDetails = result.siteImpacts.map(impact => {
    const site = sites.find(s => s.id === impact.siteId);
    return `- ${site?.name || 'Unknown'}: Allocated ${impact.allocatedStaff} new staff. New Utilization: ${Math.round(impact.newUtilization)}%. Status: ${impact.riskStatus}`;
  }).join('\n');

  const prompt = `
    As a Senior Call Center Capacity Planning Engine, provide a professional summary for a Project Manager based on the following simulation data.
    
    SIMULATION CONTEXT:
    - Sites closing: ${sites.filter(s => s.status === 'CLOSING').map(s => s.name).join(', ')}
    - Total displaced staff: ${result.displacedStaff}
    - Overall Status: ${result.overallStatus}
    - Unseated Staff: ${result.unseatedStaff}
    
    SITE DETAILS:
    ${siteDetails}
    
    ALLOCATION OUTCOME:
    ${outcomeDetails}

    Please provide a concise, high-level executive summary, identifying specific risks (utilization > 95%), and recommending next steps. Format with professional markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || "Unable to generate AI summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating AI insights.";
  }
};
