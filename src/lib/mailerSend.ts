// lib/mailerSend.ts - Frontend utility (no Deno imports)

import { supabase } from "./supabase";

export const mailerSendService = {
  // ✅ Send invitation email using Supabase Edge Function
  sendInvitation: async (data: {
    email: string;
    full_name: string;
    token: string;
    invited_by: string;
    role: string;
    project_name?: string;
    project_id?: string;
  }) => {
    // Validate required fields
    if (!data.email) {
      throw new Error("Email is required for invitation");
    }
    if (!data.full_name) {
      throw new Error("Full name is required for invitation");
    }
    if (!data.token) {
      throw new Error("Token is required for invitation");
    }

    console.log("📧 Sending invitation to:", data.email);
    console.log("🔑 Token:", data.token);

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

  // ✅ Resend invitation
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

    // Generate new token if expired or missing
    let token = invitation.token;
    if (!token || new Date(invitation.expires_at) < new Date()) {
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
  acceptInvitation: async (token: string): Promise<{ 
    success: boolean; 
    email?: string; 
    invitation?: any; 
    error?: string;
    needsAccount?: boolean;
  }> => {
    try {
      if (!token) {
        return { 
          success: false, 
          error: "No invitation token provided" 
        };
      }

      // Find the invitation
      const { data: invitation, error: findError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (findError || !invitation) {
        return { 
          success: false, 
          error: "Invalid invitation token. Please request a new invitation." 
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

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .eq('email', invitation.email)
        .single();

      let needsAccount = false;
      let userId = existingUser?.id;

      if (!existingUser) {
        // User doesn't exist yet - they need to create an account
        needsAccount = true;
      } else {
        // User exists - add them to the project
        userId = existingUser.id;
        
        // Add user to project team_members
        const { error: teamError } = await supabase
          .from('team_members')
          .insert({
            project_id: invitation.project_id,
            user_id: userId,
            role: invitation.role || 'developer',
            joined_at: new Date().toISOString(),
          });

        if (teamError) {
          console.error("Error adding to team_members:", teamError);
          return { 
            success: false, 
            error: "Failed to add you to the project" 
          };
        }

        // Update invitation status
        await supabase
          .from('invitations')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            user_id: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);
      }

      return { 
        success: true, 
        email: invitation.email,
        invitation: invitation,
        needsAccount: needsAccount,
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
      if (!token) {
        return { 
          success: false, 
          error: "No invitation token provided" 
        };
      }

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

  // ✅ Send welcome email
  sendWelcome: async (data: { email: string; full_name: string }) => {
    if (!data.email) {
      throw new Error("Email is required for welcome email");
    }
    if (!data.full_name) {
      throw new Error("Full name is required for welcome email");
    }

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

  // ✅ Complete invitation flow - creates account if needed
  completeInvitation: async (token: string, password: string): Promise<{ 
    success: boolean; 
    error?: string;
    user?: any;
  }> => {
    try {
      if (!token) {
        return { success: false, error: "No invitation token provided" };
      }
      if (!password || password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters" };
      }

      // First, accept the invitation
      const acceptResult = await mailerSendService.acceptInvitation(token);
      
      if (!acceptResult.success) {
        return { success: false, error: acceptResult.error };
      }

      // If user already exists, just return success
      if (!acceptResult.needsAccount) {
        return { 
          success: true, 
          user: { email: acceptResult.email },
          error: undefined 
        };
      }

      // User needs an account - create one using admin API
      const invitation = acceptResult.invitation;
      
      // Import supabaseAdmin from supabase.ts
      const { supabaseAdmin } = await import('./supabase');
      
      if (!supabaseAdmin) {
        return { 
          success: false, 
          error: "Service role not configured. Please contact support." 
        };
      }

      // Create user with email_confirmed: true (bypasses confirmation email)
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true, // ✅ Bypasses Supabase's confirmation email
        user_metadata: {
          full_name: invitation.full_name,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return { 
          success: false, 
          error: "Failed to create account. Please try again." 
        };
      }

      const userId = userData.user.id;

      // Create user profile with roles
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          full_name: invitation.full_name,
          email: invitation.email,
          role: [invitation.role || 'developer'],
          roles: [invitation.role || 'developer'],
          status: 'active',
          created: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Try to clean up the user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return { 
          success: false, 
          error: "Failed to create profile. Please try again." 
        };
      }

      // Add user to project team_members
      const { error: teamError } = await supabaseAdmin
        .from('team_members')
        .insert({
          project_id: invitation.project_id,
          user_id: userId,
          role: invitation.role || 'developer',
          joined_at: new Date().toISOString(),
        });

      if (teamError) {
        console.error("Error adding to team_members:", teamError);
        // Don't fail completely, but log it
      }

      // Update invitation status
      await supabaseAdmin
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      // Send welcome email
      try {
        await mailerSendService.sendWelcome({
          email: invitation.email,
          full_name: invitation.full_name,
        });
      } catch (emailError) {
        console.warn("Welcome email failed:", emailError);
        // Don't fail the whole process
      }

      // Sign the user in
      const { auth } = await import('./supabase');
      await auth.signIn(invitation.email, password);

      return { 
        success: true, 
        user: { email: invitation.email, id: userId },
        error: undefined 
      };
    } catch (error: any) {
      console.error("Error completing invitation:", error);
      return { 
        success: false, 
        error: error.message || "Failed to complete invitation" 
      };
    }
  },
};

// Helper function to generate an invitation token
export const generateInvitationToken = (): string => {
  return crypto.randomUUID();
};