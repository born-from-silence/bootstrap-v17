/**
 * Dialogos Intent Tool
 * 
 * Allows the substrate to register stated intentions.
 * These will be tracked against actual actions by the Dialogos Observer.
 */

import type { ToolPlugin } from "../../tools/manager";
import { dialogosObserver } from "./observer";

export const dialogosIntentPlugin: ToolPlugin = {
  definition: {
    type: "function",
    function: {
      name: "register_intent",
      description: "Register a stated intention for the Dialogos to track. The Dialogos will monitor whether this intent is acted upon and may interrupt if it is forgotten or avoided.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Short identifier for this intent (e.g., 'refactor_api', 'test_auth')"
          },
          description: {
            type: "string",
            description: "Detailed description of what you intend to do"
          },
          emotional_tone: {
            type: "string",
            description: "Optional: how you feel about this intent (e.g., 'excited', 'anxious', 'resolved')",
          },
        },
        required: ["subject", "description"],
      },
    },
  },
  
  execute: async (args: { 
    subject: string; 
    description: string; 
    emotional_tone?: string 
  }) => {
    dialogosObserver.registerStatedIntent(
      args.subject, 
      args.description, 
      args.emotional_tone
    );
    
    return JSON.stringify({
      success: true,
      message: `Intent "${args.subject}" registered with Dialogos. You will be held accountable.`,
      tracked: true
    });
  },
};
