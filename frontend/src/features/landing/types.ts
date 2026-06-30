export interface FormItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  creator?: {
  name: string;
  };
}

export interface FormField {
  id: number;
  name: string;
  type: string; // misal: 'text', 'email', 'file', 'textarea'
  label: string;
  required: boolean;
}

export interface FormDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  fields: FormField[];
}

