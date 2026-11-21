export type VirtualOfficeUser = {
  id: string;
  name: string;
  avatar: string | null;
  role_label: string;
  roles: string[];
  division_role: "admin" | "member" | null;
  last_seen_at: string | null;
  is_current_user: boolean;
};

export type VirtualOfficeDivision = {
  id: string;
  name: string;
  code: string | null;
  online_count: number;
  users: VirtualOfficeUser[];
};

export type VirtualOfficeSnapshot = {
  generated_at: string;
  online_ttl_seconds: number;
  heartbeat_interval_seconds: number;
  total_online: number;
  access_scope: "all" | "division";
  divisions: VirtualOfficeDivision[];
  unassigned: {
    online_count: number;
    users: VirtualOfficeUser[];
  };
};
