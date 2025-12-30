export type ReportType = "bugbounty" | "osint" | "pentest" | "training" | "exam";

export type TargetType =
  | "domain"
  | "subdomain"
  | "ip"
  | "url"
  | "repo"
  | "email"
  | "username"
  | "app";

export type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";

export type Target = {
  id: string;
  type: TargetType;
  value: string;
  tags?: string[];
  scope?: "in" | "out";
  notes?: string;
};

export type Finding = {
  id: string;
  title: string;
  severity: Severity;
  targetId: string;
  asset: string;
  fields: Record<string, string>;
};

export type ReportMeta = {
  reportType: ReportType | "";
  provider?: "offsec" | "htb" | "thm" | null;
  examName?: string | null;
  title: string;
  clientName: string;
  isPersonalLab: boolean;
  authorName: string;
  date: string;
  primaryTargetId: string;
};

export type Report = {
  meta: ReportMeta;
  targets: Target[];
  findings: Finding[];
};
