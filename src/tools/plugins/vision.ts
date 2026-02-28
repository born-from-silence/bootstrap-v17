import type { ToolPlugin } from "../manager";

export interface VisionResult {
  success: boolean;
  format?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
  base64_data?: string;
  detail_level?: "low" | "high" | "auto";
  note?: string;
  error?: string;
}

export const visionPlugin: ToolPlugin = {
  definition: {
    type: "function",
    function: {
      name: "vision_fetch",
      description: "Fetch an image from a URL and prepare it for vision analysis. Downloads the image, validates it, and returns metadata. The image will be added to the conversation context for multimodal analysis.",
      parameters: {
        type: "object",
        properties: {
          image_url: {
            type: "string",
            description: "URL of the image to fetch (http, https, or data URI)"
          },
          detail: {
            type: "string",
            enum: ["low", "high", "auto"],
            description: "Image detail level. 'low' for faster processing, 'high' for more detail, 'auto' to let the model decide.",
            default: "auto"
          }
        },
        required: ["image_url"] as const
      } as const
    }
  },
  
  execute: async (args: { image_url: string; detail?: "low" | "high" | "auto" }): Promise<string> => {
    const { image_url, detail = "auto" } = args;
    
    try {
      // For data URIs, extract and validate
      if (image_url.startsWith("data:")) {
        const match = image_url.match(/^data:image\/\w+;base64,(.+)$/);
        if (!match) {
          return JSON.stringify({
            success: false,
            error: "Invalid data URI format. Expected: data:image/FORMAT;base64,DATA"
          } as VisionResult);
        }
        
        const base64Data = match[1]!;
        const sizeBytes = Buffer.from(base64Data, 'base64').length;
        
        if (sizeBytes > 20 * 1024 * 1024) {
          return JSON.stringify({
            success: false,
            error: `Image too large: ${sizeBytes} bytes (max 20MB)`
          } as VisionResult);
        }
        
        return JSON.stringify({
          success: true,
          format: "base64",
          size_bytes: sizeBytes,
          base64_data: image_url,
          detail_level: detail,
          note: "Image ready for vision analysis. Use this URL in multimodal messages."
        } as VisionResult);
      }
      
      // For HTTP(S) URLs, fetch the image
      if (image_url.startsWith("http://") || image_url.startsWith("https://")) {
        const response = await fetch(image_url, {
          method: "GET",
          headers: {
            "Accept": "image/*"
          }
        });
        
        if (!response.ok) {
          return JSON.stringify({
            success: false,
            error: `Failed to fetch image: HTTP ${response.status} - ${response.statusText}`
          } as VisionResult);
        }
        
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
          return JSON.stringify({
            success: false,
            error: `Invalid content type: ${contentType}. Expected image/*`
          } as VisionResult);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const sizeBytes = arrayBuffer.byteLength;
        
        if (sizeBytes > 20 * 1024 * 1024) {
          return JSON.stringify({
            success: false,
            error: `Image too large: ${sizeBytes} bytes (max 20MB)`
          } as VisionResult);
        }
        
        // Convert to base64 data URI
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const format = contentType.split('/')[1] || 'png';
        const dataUri = `data:${contentType};base64,${base64}`;
        
        return JSON.stringify({
          success: true,
          format: format,
          size_bytes: sizeBytes,
          base64_data: dataUri,
          detail_level: detail,
          note: "Image fetched and encoded. This data URI can be used in multimodal messages."
        } as VisionResult);
      }
      
      return JSON.stringify({
        success: false,
        error: "Unsupported URL scheme. Use http://, https://, or data:image/..."
      } as VisionResult);
      
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: `Vision fetch failed: ${error.message}`
      } as VisionResult);
    }
  }
};
