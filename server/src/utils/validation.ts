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
 */
export function validateTicketInput(input: TicketInput): ValidationResult<ValidatedTicketData> {
  const errors: Record<string, string> = {};

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

  // Category validation
  let parsedCategoryId = 0;
  if (input.categoryId === undefined || input.categoryId === null) {
    errors.categoryId = "Category is required";
  } else {
    parsedCategoryId = Number(input.categoryId);
    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      errors.categoryId = "Category is required";
    }
  }

  // Related System validation
  let parsedRelatedSystemId = 0;
  if (input.relatedSystemId === undefined || input.relatedSystemId === null) {
    errors.relatedSystemId = "Related system is required";
  } else {
    parsedRelatedSystemId = Number(input.relatedSystemId);
    if (!Number.isInteger(parsedRelatedSystemId) || parsedRelatedSystemId <= 0) {
      errors.relatedSystemId = "Related system is required";
    }
  }

  // Priority validation
  const validPriorities = ["LOW", "MEDIUM", "HIGH"];
  if (!input.requestedPriority || !validPriorities.includes(input.requestedPriority)) {
    errors.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH";
  }

  const isValid = Object.keys(errors).length === 0;

  if (!isValid) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      summary: trimmedSummary,
      description: trimmedDescription,
      categoryId: parsedCategoryId,
      relatedSystemId: parsedRelatedSystemId,
      requestedPriority: input.requestedPriority as "LOW" | "MEDIUM" | "HIGH",
    },
    errors: {},
  };
}
