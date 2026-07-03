// src/lib/mailerSend.ts
import { supabase } from "./supabase";

export const mailerSendService = {
  // Send invitation email using Supabase Edge Function
  sendInvitation: async (data: {
    email: string;
    full_name: string;
    token: string;
    invited_by: string;
    role: string;
    project_name?: string;
  }) => {
    const { data: response, error } = await supabase.functions.invoke(
      "send-invitation",
      {
        body: {
          ...data,
          type: "invitation",
        },
      },
    );

    if (error) {
      console.error("Error sending invitation:", error);
      throw new Error(error.message || "Failed to send invitation");
    }

    return response;
  },

  // Send welcome email
  sendWelcome: async (data: { email: string; full_name: string }) => {
    const { data: response, error } = await supabase.functions.invoke(
      "send-invitation",
      {
        body: {
          ...data,
          type: "welcome",
        },
      },
    );

    if (error) {
      console.error("Error sending welcome email:", error);
      throw new Error(error.message || "Failed to send welcome email");
    }

    return response;
  },
};