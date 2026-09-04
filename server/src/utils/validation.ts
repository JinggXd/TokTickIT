export interface TicketInput {
  summary?: any;
  description?: any;
  categoryId?: any;
  relatedSystemId?: any;
  requestedPriority?: any;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: Record<string, string>;
  candidates?: {
    categoryId?: number;
    relatedSystemId?: number;
  };
}

export interface ValidatedTicketData {
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Trims and validates ticket creation input according to BR-09 and API spec 6.4.
 * Strictly verifies types (categoryId & relatedSystemId must be positive integer numbers, not strings or booleans).
 */
export function validateTicketInput(input: TicketInput): ValidationResult<ValidatedTicketData> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      isValid: false,
      errors: {
        summary: "Summary is required",
        description: "Description is required",
        categoryId: "Category is required",
        relatedSystemId: "Related system is required",
        requestedPriority: "Requested priority must be LOW, MEDIUM, or HIGH",
      },
    };
  }

  // Summary validation
  let trimmedSummary = "";
  if (input.summary === undefined || input.summary === null || typeof input.summary !== "string") {
    errors.summary = "Summary is required";
  } else {
    trimmedSummary = input.summary.trim();
    if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Summary must be between 5 and 100 characters";
    }
  }

  // Description validation
  let trimmedDescription = "";
  if (input.description === undefined || input.description === null || typeof input.description !== "string") {
    errors.description = "Description is required";
  } else {
    trimmedDescription = input.description.trim();
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters";
    }
  }

  // Category validation (Strict type check: number, integer, > 0)
  let parsedCategoryId: number | undefined = undefined;
  if (
    typeof input.categoryId !== "number" ||
    !Number.isInteger(input.categoryId) ||
    input.categoryId <= 0
  ) {
    errors.categoryId = "Category is required";
  } else {
    parsedCategoryId = input.categoryId;
  }

  // Related System validation (Strict type check: number, integer, > 0)
  let parsedRelatedSystemId: number | undefined = undefined;
  if (
    typeof input.relatedSystemId !== "number" ||
    !Number.isInteger(input.relatedSystemId) ||
    input.relatedSystemId <= 0
  ) {
    errors.relatedSystemId = "Related system is required";
  } else {
    parsedRelatedSystemId = input.relatedSystemId;
  }

  // Priority validation
  const validPriorities = ["LOW", "MEDIUM", "HIGH"];
  if (!input.requestedPriority || !validPriorities.includes(input.requestedPriority)) {
    errors.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH";
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    data: isValid
      ? {
          summary: trimmedSummary,
          description: trimmedDescription,
          categoryId: parsedCategoryId!,
          relatedSystemId: parsedRelatedSystemId!,
          requestedPriority: input.requestedPriority as "LOW" | "MEDIUM" | "HIGH",
        }
      : undefined,
    errors,
    candidates: {
      categoryId: parsedCategoryId,
      relatedSystemId: parsedRelatedSystemId,
    },
  };
}
