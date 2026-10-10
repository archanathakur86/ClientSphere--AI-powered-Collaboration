import { z } from "zod";
import { getPasswordError } from "./passwordPolicy.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const registerSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).trim().min(1, "Name is required"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address"),
      password: z.string({ required_error: "Password is required" }).superRefine((pw, ctx) => {
        const problem = getPasswordError(pw);
        if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
      }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address"),
    password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
  }),
});

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Project name is required" }).trim().min(1, "Project name is required"),
    description: z.string().optional(),
    clientName: z.string().trim().max(120).optional(),
    // Optional, but if given it must be a real email (empty string = "no client yet").
    clientEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email("Invalid client email")]).optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    readme: z.string().optional(),
  }),
});

export const toggleProjectVisibilitySchema = z.object({
  body: z.object({
    isPublic: z.boolean(),
  }),
});

export const addMemberSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Member email is required" }).trim().toLowerCase().email("Invalid email address"),
    role: z.enum(["editor", "viewer", "commentor"]).optional(),
  }),
});

export const inviteClientSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Client email is required" }).trim().toLowerCase().email("Invalid email address"),
    clientName: z.string().trim().max(120).optional(),
  }),
});

export const createMilestoneSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Milestone title is required" }).trim().min(1, "Milestone title is required"),
    description: z.string().optional(),
    dueDate: z.union([z.string().min(1), z.null()]).optional(),
    amount: z.union([z.number(), z.string()]).optional(),
  }),
});

export const updateMilestoneSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    dueDate: z.union([z.string().min(1), z.null()]).optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    status: z.enum(["pending", "in review", "changes requested", "approved"]).optional(),
    comment: z.string().trim().optional(),
    reason: z.string().trim().optional(),
  }),
});

export const requestChangesSchema = z.object({
  body: z.object({
    comment: z.string({ required_error: "A change request comment is required" }).trim().min(1, "A change request comment is required"),
  }),
});

export const createNoteSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Note title is required" }).trim().min(1, "Note title is required"),
    content: z.string({ required_error: "Note content is required" }).trim().min(1, "Note content is required"),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).optional(),
    content: z.string().optional(),
  }),
});

export const noteVisibilitySchema = z.object({
  body: z.object({
    isShared: z.boolean(),
  }),
});

export const fileVisibilitySchema = z.object({
  body: z.object({
    isShared: z.boolean(),
  }),
});

export const fileReviewSchema = z.object({
  body: z.object({
    regenerate: z.boolean().optional(),
  }),
});

export const commentVisibilitySchema = z.object({
  body: z.object({
    isShared: z.boolean(),
  }),
});

export const invoiceUpdateSchema = z.object({
  body: z.object({
    amount: z.union([z.number(), z.string()]).optional(),
    dueDate: z.union([z.string().min(1), z.null()]).optional(),
    status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  }),
});

export const weeklyDraftSchema = z.object({
  body: z.object({
    content: z.string({ required_error: "Weekly update content is required" }).trim().min(1, "Weekly update content is required"),
  }),
});

export const assistantChatSchema = z.object({
  body: z.object({
    message: z.string({ required_error: "Message is required" }).trim().min(1, "Message cannot be empty"),
    conversationId: objectIdSchema.optional(),
    projectId: objectIdSchema.optional(),
  }),
});

export const rememberFactSchema = z.object({
  body: z.object({
    fact: z.string({ required_error: "Fact is required" }).trim().min(1, "Fact cannot be empty"),
  }),
});

export const searchSchema = z.object({
  query: z.object({
    q: z.string({ required_error: "Search query is required" }).trim().min(2, "Search query must be at least 2 characters"),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    status: z.enum(["todo", "in-progress", "done"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    title: z.string().trim().min(1).optional(),
  }),
});
export const createTaskSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Task title is required" }).trim().min(1, "Task title is required").max(200, "Task title is too long"),
    priority: z.enum(["low", "medium", "high"]).optional(),
    assigneeGuess: z.string().trim().max(100, "Assignee is too long").optional(),
    assignee: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid assignee").nullable().optional(),
  }),
});

export const addCommentSchema = z.object({
  body: z.object({
        content: z.string().trim().max(2000, "Message is too long").optional().default(""),
  // Staff only: publish this comment to the client portal straight away.
    isShared: z.boolean().optional(),
  }),
});