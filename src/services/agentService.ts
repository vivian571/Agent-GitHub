import { GoogleGenAI, Type } from "@google/genai";
import { GitHubIssue } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class AgentService {
  async plan(issue: GitHubIssue) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this GitHub issue and provide a plan.
      Title: ${issue.title}
      Description: ${issue.body}
      
      Output JSON format:
      {
        "root_cause": "string",
        "files": ["string"],
        "steps": ["string"]
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            root_cause: { type: Type.STRING },
            files: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["root_cause", "files", "steps"]
        }
      }
    });
    return JSON.parse(response.text);
  }

  async code(plan: any, fileContents: Record<string, string>) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this plan: ${JSON.stringify(plan)}
      And these files: ${JSON.stringify(fileContents)}
      
      Generate the updated code for each file.
      Output JSON format:
      {
        "updated_files": { "filename": "content" },
        "explanation": "string"
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updated_files: { type: Type.OBJECT },
            explanation: { type: Type.STRING }
          },
          required: ["updated_files", "explanation"]
        }
      }
    });
    return JSON.parse(response.text);
  }

  async review(plan: any, originalFiles: Record<string, string>, updatedFiles: Record<string, string>) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Review these changes.
      Plan: ${JSON.stringify(plan)}
      Original: ${JSON.stringify(originalFiles)}
      Updated: ${JSON.stringify(updatedFiles)}
      
      Output JSON format:
      {
        "decision": "APPROVE" | "REJECT",
        "reason": "string"
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING, enum: ["APPROVE", "REJECT"] },
            reason: { type: Type.STRING }
          },
          required: ["decision", "reason"]
        }
      }
    });
    return JSON.parse(response.text);
  }

  async debug(errorLog: string, code: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Fix this error.
      Log: ${errorLog}
      Code: ${code}
      
      Output JSON format:
      {
        "fix": "string",
        "updated_code": "string"
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fix: { type: Type.STRING },
            updated_code: { type: Type.STRING }
          },
          required: ["fix", "updated_code"]
        }
      }
    });
    return JSON.parse(response.text);
  }
}
