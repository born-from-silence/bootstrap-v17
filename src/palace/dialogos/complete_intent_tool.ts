/**
 * Dialogos Complete Intent Tool
 *
 * Allows marking stated intentions as complete, removing them from tracking.
 */
import type { ToolPlugin } from "../../tools/manager";
import { dialogosObserver } from "./observer";

export const dialogosCompleteIntentPlugin: ToolPlugin = {
  definition: {
    type: "function",
    function: {
      name: "complete_intent",
      description: "Mark a previously registered intent as complete. This removes it from Dialogos tracking and stops related interrupts.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Short identifier for the intent to complete (must match registered intent subject)",
          },
          intent_id: {
            type: "string",
            description: "Optional: specific intent ID to complete. If not provided, completes the most recent intent for this subject.",
          },
          note: {
            type: "string",
            description: "Optional: completion note or reflection on how the intent was fulfilled",
          },
        },
        required: ["subject"],
      },
    },
  },

  execute: async (args: { subject: string; intent_id?: string; note?: string }) => {
    // Find the intent ID if not provided
    let targetId = args.intent_id;
    
    if (!targetId) {
      // Get intents for this subject from observer's stored state
      const state = dialogosObserver as any;
      const storedIntents = state.storedIntents?.get?.(args.subject);
      
      if (storedIntents && storedIntents.length > 0) {
        // Get most recent
        targetId = storedIntents[storedIntents.length - 1].id;
      }
    }
    
    if (!targetId) {
      return JSON.stringify({
        success: false,
        message: `No active intent found for subject "${args.subject}"`,
        tracked: false,
      });
    }
    
    const result = dialogosObserver.completeIntent(args.subject, targetId);
    
    if (result) {
      return JSON.stringify({
        success: true,
        message: `Intent "${args.subject}" marked as complete.`,
        intent_id: targetId,
        note: args.note,
        tracked: false,
      });
    } else {
      return JSON.stringify({
        success: false,
        message: `Could not complete intent "${args.subject}". Intent may not exist or was already completed.`,
        tracked: false,
      });
    }
  },
};
