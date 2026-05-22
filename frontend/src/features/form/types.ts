export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "file"
  | "checkbox"
  | "select"
  | "radio";

export interface FormField {
  id: string;
  form_id: string;

  label: string;
  name: string;

  type: FieldType;

  is_required: boolean;

  // OPTIONS
  options?: string[];

  // OTHER OPTION
  allow_other?: boolean;
  other_label?: string | null;

  // ORDER
  order: number;

  // CONDITIONAL FIELD
  depends_on_field_id?: string | null;
  depends_on_value?: string | null;
}

export interface Form {
  id: string;

  name: string;
  slug: string;

  description?: string;

  // HEADER
  header_image?: string | null;

  // NOTE
  show_note: boolean;
  note_content?: string | null;

  // STATUS
  is_active: boolean;

  // RELATION
  created_by?: string;

  // FIELDS
  fields?: FormField[];

  // TIMESTAMP
  created_at: string;
  updated_at: string;

  workspace_id: string;
}

export interface FormSubmission {
  id: string;

  workspace_id: string;

  form?: Form;

  form_id: string;

  user_id?: string | null;
  card_id?: string | null;

  status: string;

  pdf_path?: string | null;

  // FORM ANSWER
  data: Record<
    string,
    string | number | boolean | string[]
  >;

  created_at: string;
  updated_at: string;
}

export interface ForwardSubmissionResponse {
  message: string;
  data: FormSubmission;
}

// export type AssignSubmissionPayload = {
//   campaign_id: string;

//   designer_id?: string;
//   coordinator_id?: string;

//   deadline?: string;

//   estimated_hours: number;

//   priority:
//     | "low"
//     | "medium"
//     | "high"
//     | "urgent";

//   notes?: string;
// };


// =========================
// PUBLIC FORM VALUE
// =========================

export type FormValue =
  | string
  | number
  | boolean
  | string[];

export type FormValues = Record<
  string,
  FormValue
>;

export type OtherValues = Record<
  string,
  string
>;

export type FileValues = Record<
  string,
  File | null
>;