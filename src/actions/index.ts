import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  FileConversionJobs,
  FileConversionPresets,
  and,
  db,
  eq,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedPreset(presetId: string, userId: string) {
  const [preset] = await db
    .select()
    .from(FileConversionPresets)
    .where(and(eq(FileConversionPresets.id, presetId), eq(FileConversionPresets.userId, userId)));

  if (!preset) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Conversion preset not found.",
    });
  }

  return preset;
}

export const server = {
  createConversionJob: defineAction({
    input: z.object({
      sourceFormat: z.string().optional(),
      targetFormat: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      inputFileName: z.string().optional(),
      inputFileUrl: z.string().optional(),
      outputFileName: z.string().optional(),
      outputFileUrl: z.string().optional(),
      settingsJson: z.string().optional(),
      errorMessage: z.string().optional(),
      inputSizeBytes: z.number().optional(),
      outputSizeBytes: z.number().optional(),
      completedAt: z.date().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [job] = await db
        .insert(FileConversionJobs)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          sourceFormat: input.sourceFormat,
          targetFormat: input.targetFormat,
          category: input.category,
          status: input.status ?? "queued",
          inputFileName: input.inputFileName,
          inputFileUrl: input.inputFileUrl,
          outputFileName: input.outputFileName,
          outputFileUrl: input.outputFileUrl,
          settingsJson: input.settingsJson,
          errorMessage: input.errorMessage,
          inputSizeBytes: input.inputSizeBytes,
          outputSizeBytes: input.outputSizeBytes,
          createdAt: now,
          completedAt: input.completedAt,
        })
        .returning();

      return { success: true, data: { job } };
    },
  }),

  updateConversionJob: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        status: z.string().optional(),
        outputFileName: z.string().optional(),
        outputFileUrl: z.string().optional(),
        settingsJson: z.string().optional(),
        errorMessage: z.string().optional(),
        inputSizeBytes: z.number().optional(),
        outputSizeBytes: z.number().optional(),
        completedAt: z.date().optional(),
      })
      .refine(
        (input) =>
          input.status !== undefined ||
          input.outputFileName !== undefined ||
          input.outputFileUrl !== undefined ||
          input.settingsJson !== undefined ||
          input.errorMessage !== undefined ||
          input.inputSizeBytes !== undefined ||
          input.outputSizeBytes !== undefined ||
          input.completedAt !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(FileConversionJobs)
        .where(and(eq(FileConversionJobs.id, input.id), eq(FileConversionJobs.userId, user.id)));

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Conversion job not found.",
        });
      }

      const [job] = await db
        .update(FileConversionJobs)
        .set({
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.outputFileName !== undefined ? { outputFileName: input.outputFileName } : {}),
          ...(input.outputFileUrl !== undefined ? { outputFileUrl: input.outputFileUrl } : {}),
          ...(input.settingsJson !== undefined ? { settingsJson: input.settingsJson } : {}),
          ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
          ...(input.inputSizeBytes !== undefined ? { inputSizeBytes: input.inputSizeBytes } : {}),
          ...(input.outputSizeBytes !== undefined ? { outputSizeBytes: input.outputSizeBytes } : {}),
          ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        })
        .where(eq(FileConversionJobs.id, input.id))
        .returning();

      return { success: true, data: { job } };
    },
  }),

  listConversionJobs: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const jobs = await db
        .select()
        .from(FileConversionJobs)
        .where(eq(FileConversionJobs.userId, user.id));

      return { success: true, data: { items: jobs, total: jobs.length } };
    },
  }),

  createPreset: defineAction({
    input: z.object({
      name: z.string().min(1),
      sourceFormat: z.string().optional(),
      targetFormat: z.string().optional(),
      category: z.string().optional(),
      settingsJson: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [preset] = await db
        .insert(FileConversionPresets)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: input.name,
          sourceFormat: input.sourceFormat,
          targetFormat: input.targetFormat,
          category: input.category,
          settingsJson: input.settingsJson,
          createdAt: new Date(),
        })
        .returning();

      return { success: true, data: { preset } };
    },
  }),

  updatePreset: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        sourceFormat: z.string().optional(),
        targetFormat: z.string().optional(),
        category: z.string().optional(),
        settingsJson: z.string().optional(),
      })
      .refine(
        (input) =>
          input.name !== undefined ||
          input.sourceFormat !== undefined ||
          input.targetFormat !== undefined ||
          input.category !== undefined ||
          input.settingsJson !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedPreset(input.id, user.id);

      const [preset] = await db
        .update(FileConversionPresets)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sourceFormat !== undefined ? { sourceFormat: input.sourceFormat } : {}),
          ...(input.targetFormat !== undefined ? { targetFormat: input.targetFormat } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.settingsJson !== undefined ? { settingsJson: input.settingsJson } : {}),
        })
        .where(eq(FileConversionPresets.id, input.id))
        .returning();

      return { success: true, data: { preset } };
    },
  }),

  deletePreset: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedPreset(input.id, user.id);

      const result = await db
        .delete(FileConversionPresets)
        .where(eq(FileConversionPresets.id, input.id));

      if (result.rowsAffected === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Conversion preset not found.",
        });
      }

      return { success: true };
    },
  }),

  listPresets: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const presets = await db
        .select()
        .from(FileConversionPresets)
        .where(eq(FileConversionPresets.userId, user.id));

      return { success: true, data: { items: presets, total: presets.length } };
    },
  }),
};
