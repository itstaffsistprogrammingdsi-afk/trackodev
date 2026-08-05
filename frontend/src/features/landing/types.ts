export interface FormItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  creator?: {
  name: string;
  };
}

export interface FormField {
  id: string;
  name: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "file"
    | "checkbox"
    | "select"
    | "radio";
  label: string;
  is_required: boolean;
  options?: string[];
}

export interface FormDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: FormField[];
}

