import { supabase } from "@/lib/supabase";

/* -------------------- TYPES -------------------- */

export type VerificationStatus = "pending" | "approved" | "rejected";

export type TeacherVerificationRequest = {
  id: string;
  user_id: string;
  details: string;
  status: VerificationStatus;
  created_at: string;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type VerificationResult = {
  success: boolean;
  message: string;
  data?: TeacherVerificationRequest | null;
  error?: Error | null;
};

/* -------------------- SUBMIT VERIFICATION REQUEST -------------------- */

export async function submitTeacherVerification(details: string): Promise<{
  data: TeacherVerificationRequest | null;
  error: Error | null;
}> {
  try {
    const trimmedDetails = details.trim();

    if (!trimmedDetails) {
      return {
        data: null,
        error: new Error("Please enter your verification details."),
      };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return {
        data: null,
        error: new Error(authError.message),
      };
    }

    if (!user) {
      return {
        data: null,
        error: new Error(
          "You must be signed in to submit a verification request.",
        ),
      };
    }

    // Prevent duplicate pending requests.
    const { data: existingRequest, error: existingError } = await supabase
      .from("teacher_verification_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return {
        data: null,
        error: new Error(existingError.message),
      };
    }

    if (existingRequest) {
      return {
        data: null,
        error: new Error(
          "You already have a pending teacher verification request.",
        ),
      };
    }

    const { data, error } = await supabase
      .from("teacher_verification_requests")
      .insert({
        user_id: user.id,
        details: trimmedDetails,
        status: "pending",
      })
      .select(
        "id, user_id, details, status, created_at, admin_notes, reviewed_at, reviewed_by",
      )
      .single();

    if (error) {
      console.error("SUBMIT TEACHER VERIFICATION ERROR:", error);

      return {
        data: null,
        error: new Error(
          error.code === "23505"
            ? "A verification request already exists for this account."
            : error.message,
        ),
      };
    }

    return {
      data: data as TeacherVerificationRequest,
      error: null,
    };
  } catch (error) {
    console.error("SUBMIT TEACHER VERIFICATION ERROR:", error);

    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error("Unable to submit the verification request."),
    };
  }
}

/* -------------------- GET CURRENT USER REQUEST -------------------- */

export async function getMyTeacherVerificationRequest(): Promise<{
  data: TeacherVerificationRequest | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return {
        data: null,
        error: new Error(authError.message),
      };
    }

    if (!user) {
      return {
        data: null,
        error: new Error("Please sign in to view your request."),
      };
    }

    const { data, error } = await supabase
      .from("teacher_verification_requests")
      .select(
        "id, user_id, details, status, created_at, admin_notes, reviewed_at, reviewed_by",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("GET MY VERIFICATION REQUEST ERROR:", error);

      return {
        data: null,
        error: new Error(error.message),
      };
    }

    return {
      data: data as TeacherVerificationRequest | null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error("Unable to retrieve your verification request."),
    };
  }
}

/* -------------------- GET PENDING REQUESTS (ADMIN) -------------------- */

export async function getTeacherVerificationRequests(): Promise<{
  data: TeacherVerificationRequest[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("teacher_verification_requests")
      .select(
        "id, user_id, details, status, created_at, admin_notes, reviewed_at, reviewed_by",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("GET TEACHER VERIFICATION REQUESTS ERROR:", error);

      return {
        data: [],
        error: new Error(error.message),
      };
    }

    return {
      data: (data ?? []) as TeacherVerificationRequest[],
      error: null,
    };
  } catch (error) {
    console.error("GET TEACHER VERIFICATION REQUESTS ERROR:", error);

    return {
      data: [],
      error:
        error instanceof Error
          ? error
          : new Error("Unable to load verification requests."),
    };
  }
}

/* -------------------- APPROVE OR REJECT REQUEST -------------------- */

export async function reviewTeacherVerificationRequest(
  requestId: string,
  decision: "approved" | "rejected",
  notes = "",
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    if (!requestId.trim()) {
      return {
        success: false,
        error: new Error("Verification request ID is missing."),
      };
    }

    const { error } = await supabase.rpc(
      "review_teacher_verification_request",
      {
        target_request_id: requestId,
        decision,
        notes: notes.trim() || null,
      },
    );

    if (error) {
      console.error("REVIEW TEACHER VERIFICATION ERROR:", error);

      return {
        success: false,
        error: new Error(error.message),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("REVIEW TEACHER VERIFICATION ERROR:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error
          : new Error("Unable to review the verification request."),
    };
  }
}
