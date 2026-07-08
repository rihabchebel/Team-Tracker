import { supabase } from "./supabase";

export const mailerSendService = {
  // ✅ Send invitation email using your existing invitations table
  sendInvitation: async (data: {
    email: string;
    full_name: string;
    token: string;
    invited_by: string;
    role: string;
    project_name?: string;
    project_id?: string;
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
  
  // ✅ Resend invitation (reuse existing token or generate new one)
  resendInvitation: async (invitationId: string) => {
    // Get the existing invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      throw new Error("Invitation not found");
    }

    // Check if invitation is still valid
    if (invitation.status === 'accepted') {
      throw new Error("Invitation has already been accepted");
    }

    if (invitation.status === 'rejected') {
      throw new Error("Invitation has been rejected");
    }

    // Generate new token if expired
    let token = invitation.token;
    if (new Date(invitation.expires_at) < new Date()) {
      token = crypto.randomUUID();
      // Update invitation with new token and expiry
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) {
        throw new Error("Failed to update invitation");
      }
    }

    // Get project name if project_id exists
    let project_name = undefined;
    if (invitation.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', invitation.project_id)
        .single();
      project_name = project?.name;
    }

    // Send the invitation email
    return await mailerSendService.sendInvitation({
      email: invitation.email,
      full_name: invitation.full_name,
      token: token,
      invited_by: invitation.invited_by,
      role: invitation.role,
      project_name: project_name,
      project_id: invitation.project_id,
    });
  },

  // ✅ Accept invitation
  acceptInvitation: async (token: string): Promise<{ success: boolean; email?: string; invitation?: any; error?: string }> => {
    try {
      // Find the invitation
      const { data: invitation, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (findError || !invitation) {
        return { 
          success: false, 
          error: "Invalid invitation token" 
        };
      }

      // Check if already accepted
      if (invitation.status === 'accepted') {
        return { 
          success: false, 
          error: "Invitation has already been accepted" 
        };
      }

      // Check if rejected
      if (invitation.status === 'rejected') {
        return { 
          success: false, 
          error: "Invitation has been rejected" 
        };
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        // Update status to expired
        await supabase
          .from('invitations')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);
        
        return { 
          success: false, 
          error: "Invitation has expired. Please request a new one." 
        };
      }

      // Update invitation status to accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error("Error updating invitation:", updateError);
        return { 
          success: false, 
          error: "Failed to accept invitation" 
        };
      }

      // Return the invitation data for further processing
      return { 
        success: true, 
        email: invitation.email,
        invitation: invitation,
      };
    } catch (error) {
      console.error("Error accepting invitation:", error);
      return { 
        success: false, 
        error: "Failed to accept invitation" 
      };
    }
  },

  // ✅ Reject invitation
  rejectInvitation: async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: invitation, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (findError || !invitation) {
        return { 
          success: false, 
          error: "Invalid invitation token" 
        };
      }

      if (invitation.status === 'accepted') {
        return { 
          success: false, 
          error: "Invitation has already been accepted" 
        };
      }

      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) {
        return { 
          success: false, 
          error: "Failed to reject invitation" 
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      return { 
        success: false, 
        error: "Failed to reject invitation" 
      };
    }
  },

  // ✅ FIX ADDED: Send welcome email method (resolves ts(2339))
  sendWelcome: async (data: { email: string; full_name: string }) => {
    const { data: response, error } = await supabase.functions.invoke(
      "send-welcome",
      {
        body: {
          email: data.email,
          full_name: data.full_name,
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